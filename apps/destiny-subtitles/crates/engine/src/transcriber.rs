use std::time::Instant;

use crate::speech::{SpeechEngine, SpeechError};
use crate::stabilizer::TranscriptEvent;
use crate::word::WordToken;

pub const SAMPLE_RATE: usize = 16_000;
const TAIL_WORDS: usize = 24;
const MAX_MATCH: usize = 12;

/// Lowercase letters and digits only, so "Christ." == "christ".
fn normalise(s: &str) -> String {
    s.chars().filter(|c| c.is_alphanumeric()).flat_map(char::to_lowercase).collect()
}

fn common_prefix_len(prev: &[String], fresh: &[WordToken]) -> usize {
    prev.iter().zip(fresh).take_while(|(p, w)| **p == normalise(&w.text)).count()
}

/// Sliding-window driver. Every `stride` of new audio it re-transcribes the
/// last `window` seconds and emits a `Partial` (words that may still change)
/// plus a `Finalized` segment for words no later window can reconsider.
///
/// Stream time comes from sample counts, not wall-clock timestamps, so it
/// cannot drift over a long service.
///
/// Differences from the Swift original:
/// - Windows grow from the first `stride` of audio instead of waiting for a
///   full window, so the first caption appears after ~3.5 s, not 10 s.
/// - Words are stitched by text with local agreement (a word is final once two
///   consecutive windows agree on it). The original cut by word timestamps,
///   but whisper's word times are unreliable, which dropped and duplicated
///   words (seen on a real recording), and its cutoff sat before every word
///   in the window so nothing was ever finalised.
pub struct StreamingTranscriber<E: SpeechEngine> {
    engine: E,
    prompt: String,
    window: usize,
    stride: usize,
    buffer: Vec<f32>,
    /// Stream index (in samples) of `buffer[0]`.
    buffer_start: usize,
    since_run: usize,
    filled_once: bool,
    window_counter: u64,
    segment_counter: u64,
    /// Normalised last few confirmed words, used to find where a new window
    /// continues from.
    tail: Vec<String>,
    /// Last window's tentative words (normalised), for local agreement.
    prev_hyp: Vec<String>,
    last_confirmed_time: f64,
    last_window_start: f64,
    pending: Vec<WordToken>,
    pub failed_windows: u64,
}

impl<E: SpeechEngine> StreamingTranscriber<E> {
    pub fn new(engine: E, prompt: String) -> Self {
        Self::with_timing(engine, prompt, 10.0, 3.5)
    }

    pub fn with_timing(engine: E, prompt: String, window_secs: f64, stride_secs: f64) -> Self {
        assert!(stride_secs > 0.0 && window_secs > stride_secs);
        Self {
            engine,
            prompt,
            window: (window_secs * SAMPLE_RATE as f64) as usize,
            stride: (stride_secs * SAMPLE_RATE as f64) as usize,
            buffer: Vec::new(),
            buffer_start: 0,
            since_run: 0,
            filled_once: false,
            window_counter: 0,
            segment_counter: 0,
            tail: Vec::new(),
            prev_hyp: Vec::new(),
            last_confirmed_time: f64::NEG_INFINITY,
            last_window_start: 0.0,
            pending: Vec::new(),
            failed_windows: 0,
        }
    }

    pub fn set_prompt(&mut self, prompt: String) {
        self.prompt = prompt;
    }

    /// Feed 16 kHz mono samples. Returns the events produced (zero or more
    /// windows can complete if a large chunk is pushed).
    pub fn push(&mut self, samples: &[f32], now: Instant) -> Vec<TranscriptEvent> {
        let mut events = Vec::new();
        let mut rest = samples;
        while !rest.is_empty() {
            let mut room = self.stride - self.since_run;
            // While growing, also stop exactly when the buffer first fills the
            // window, so the first full window starts at stream time zero and
            // no early word is skipped.
            if self.buffer.len() < self.window {
                room = room.min(self.window - self.buffer.len());
            }
            let take = room.min(rest.len());
            self.buffer.extend_from_slice(&rest[..take]);
            self.since_run += take;
            rest = &rest[take..];
            let first_fill = !self.filled_once && self.buffer.len() >= self.window;
            if self.since_run >= self.stride || first_fill {
                self.since_run = 0;
                self.run_window(now, &mut events);
            }
        }
        events
    }

    /// End of stream: run one last window over any audio not yet seen, then
    /// whatever is still pending becomes final.
    pub fn finish(&mut self, now: Instant) -> Vec<TranscriptEvent> {
        let mut events = Vec::new();
        if self.since_run > 0 {
            self.since_run = 0;
            self.run_window(now, &mut events);
        }
        if !self.pending.is_empty() {
            self.segment_counter += 1;
            events.push(TranscriptEvent::Finalized {
                words: std::mem::take(&mut self.pending),
                segment_id: self.segment_counter,
            });
        }
        events
    }

    fn run_window(&mut self, now: Instant, events: &mut Vec<TranscriptEvent>) {
        let win_len = self.buffer.len().min(self.window);
        let full = self.buffer.len() >= self.window;
        self.filled_once |= full;
        let first = self.buffer.len() - win_len;
        let window_start = (self.buffer_start + first) as f64 / SAMPLE_RATE as f64;
        self.last_window_start = window_start;

        self.window_counter += 1;
        let result = self.engine.transcribe(&self.buffer[first..], &self.prompt);
        self.trim();

        let raw = match result {
            Ok(raw) => raw,
            Err(SpeechError(_)) => {
                // One failed window should not stop the stream: the next
                // window overlaps and will usually recover the audio.
                self.failed_windows += 1;
                return;
            }
        };
        let words: Vec<WordToken> = raw
            .into_iter()
            .map(|w| {
                let mut t = WordToken::new(w.text, window_start + w.start, now);
                t.confidence = w.confidence;
                t
            })
            .collect();

        // Whisper's per-word timestamps are unreliable (many collapse to the
        // window end), so words are stitched by TEXT, not time:
        // 1. skip the part of this window that repeats words already confirmed;
        // 2. confirm the prefix that this and the previous window agree on
        //    (local agreement), leave the rest as a tentative partial.
        let fresh = self.skip_confirmed(words);
        let agreed = common_prefix_len(&self.prev_hyp, &fresh);
        let (done, rest): (Vec<_>, Vec<_>) = {
            let mut fresh = fresh;
            let rest = fresh.split_off(agreed);
            (fresh, rest)
        };

        if !done.is_empty() {
            for w in &done {
                self.tail.push(normalise(&w.text));
            }
            let overflow = self.tail.len().saturating_sub(TAIL_WORDS);
            self.tail.drain(..overflow);
            self.last_confirmed_time = done.last().map(|w| w.start_time).unwrap_or(self.last_confirmed_time);
            self.segment_counter += 1;
            events.push(TranscriptEvent::Finalized { words: done, segment_id: self.segment_counter });
        }
        self.prev_hyp = rest.iter().map(|w| normalise(&w.text)).collect();
        self.pending = rest.clone();
        events.push(TranscriptEvent::Partial { words: rest, window_id: self.window_counter });
    }

    /// Drop the leading words of `words` that repeat the confirmed tail.
    fn skip_confirmed(&self, words: Vec<WordToken>) -> Vec<WordToken> {
        if self.tail.is_empty() {
            return words;
        }
        let norm: Vec<String> = words.iter().map(|w| normalise(&w.text)).collect();
        let max_k = self.tail.len().min(MAX_MATCH);
        for k in (1..=max_k).rev() {
            let want = &self.tail[self.tail.len() - k..];
            // A single-word match is too ambiguous ("the", "and") unless the
            // whole tail is that short.
            if k == 1 && self.tail.len() > 1 {
                break;
            }
            if let Some(j) = (0..=norm.len().saturating_sub(k)).find(|&j| norm.len() >= k && norm[j..j + k] == *want) {
                return words.into_iter().skip(j + k).collect();
            }
        }
        // Lost the overlap (very long gap or heavy rewording): fall back to time.
        let t = self.last_confirmed_time;
        words.into_iter().filter(|w| w.start_time > t + 0.05).collect()
    }

    /// Keep just the overlap the next window needs, so the buffer stays
    /// bounded for a 90 minute service.
    fn trim(&mut self) {
        // Only once the window has filled: before that, early audio is still
        // needed by the growing window.
        let keep = self.window - self.stride;
        if self.buffer.len() >= self.window && self.buffer.len() > keep {
            let drop = self.buffer.len() - keep;
            self.buffer.drain(..drop);
            self.buffer_start += drop;
        }
    }

    pub fn window_counter(&self) -> u64 {
        self.window_counter
    }

    pub fn last_window_start(&self) -> f64 {
        self.last_window_start
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::speech::RawWord;

    /// Knows the true words and times of the whole stream and answers any
    /// window with the ones inside it, like a perfect recogniser.
    struct Oracle {
        words: Vec<(String, f64)>,
        stream_pos: std::sync::Arc<std::sync::Mutex<f64>>,
        /// Mimic whisper: words in the last third of a window all report the
        /// window end as their start time.
        collapse_times: bool,
    }

    impl SpeechEngine for Oracle {
        fn transcribe(&mut self, samples: &[f32], _p: &str) -> Result<Vec<RawWord>, SpeechError> {
            let end = *self.stream_pos.lock().unwrap();
            let dur = samples.len() as f64 / SAMPLE_RATE as f64;
            let start = end - dur;
            Ok(self
                .words
                .iter()
                .filter(|(_, t)| *t >= start && *t < end)
                .map(|(w, t)| {
                    let rel = t - start;
                    let rel = if self.collapse_times && rel > dur * 0.7 { dur } else { rel };
                    RawWord { text: w.clone(), start: rel, confidence: None }
                })
                .collect())
        }
    }

    fn run(total_secs: usize, collapse: bool) -> (Vec<String>, Vec<String>, Vec<TranscriptEvent>) {
        let truth: Vec<(String, f64)> = (0..total_secs * 2).map(|i| (format!("w{i}"), i as f64 * 0.5 + 0.1)).collect();
        let pos = std::sync::Arc::new(std::sync::Mutex::new(0.0));
        let mut t = StreamingTranscriber::new(Oracle { words: truth.clone(), stream_pos: pos.clone(), collapse_times: collapse }, String::new());
        let now = Instant::now();
        let mut events = Vec::new();
        let chunk = SAMPLE_RATE / 10; // 100 ms
        for i in 1..=total_secs * 10 {
            *pos.lock().unwrap() = i as f64 / 10.0;
            events.extend(t.push(&vec![0.0; chunk], now));
        }
        events.extend(t.finish(now));
        let mut finalized = Vec::new();
        for e in &events {
            if let TranscriptEvent::Finalized { words, .. } = e {
                finalized.extend(words.iter().map(|w| w.text.clone()));
            }
        }
        let expected = truth.iter().map(|(w, _)| w.clone()).collect();
        (finalized, expected, events)
    }

    #[test]
    fn every_word_finalised_once_in_order() {
        let (finalized, expected, _) = run(60, false);
        // Flushing at the end means every word is heard exactly once.
        assert_eq!(finalized, expected);
    }

    #[test]
    fn unreliable_word_times_neither_drop_nor_duplicate() {
        let (finalized, expected, _) = run(60, true);
        assert_eq!(finalized, expected);
    }

    #[test]
    fn first_caption_appears_before_a_full_window() {
        let (_, _, events) = run(5, false);
        assert!(matches!(events.first(), Some(TranscriptEvent::Partial { words, .. }) if !words.is_empty()));
    }

    #[test]
    fn buffer_stays_bounded() {
        let pos = std::sync::Arc::new(std::sync::Mutex::new(0.0));
        let mut t = StreamingTranscriber::new(Oracle { words: vec![], stream_pos: pos, collapse_times: false }, String::new());
        let now = Instant::now();
        for _ in 0..600 {
            t.push(&vec![0.0; SAMPLE_RATE], now); // 10 minutes
        }
        assert!(t.buffer.len() <= t.window);
    }
}
