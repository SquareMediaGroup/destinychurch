use std::time::{Duration, Instant};

use crate::word::WordToken;

/// What the speech engine emits: either a tentative tail the next window may
/// rewrite, or a segment that can never change again.
#[derive(Debug, Clone)]
pub enum TranscriptEvent {
    Partial { words: Vec<WordToken>, window_id: u64 },
    Finalized { words: Vec<WordToken>, segment_id: u64 },
}

/// Decides which words are steady enough to put on screen. A partial word must
/// survive unchanged across windows for `stability_delay` before it is shown,
/// so captions do not churn mid-sentence.
#[derive(Debug)]
pub struct Stabilizer {
    pub stability_delay: Duration,
    finalized: Vec<WordToken>,
    partial: Vec<WordToken>,
    last_segment_id: u64,
}

impl Stabilizer {
    pub fn new(stability_delay: Duration) -> Self {
        Self {
            stability_delay,
            finalized: Vec::new(),
            partial: Vec::new(),
            last_segment_id: 0,
        }
    }

    pub fn ingest(&mut self, event: TranscriptEvent) {
        match event {
            TranscriptEvent::Finalized { words, segment_id } => {
                // IDs rise monotonically; anything at or below is a duplicate.
                if segment_id <= self.last_segment_id {
                    return;
                }
                self.last_segment_id = segment_id;
                self.finalized.extend(words);
                // The transcriber follows every Finalized with a Partial that
                // holds only the still-unconfirmed words.
                self.partial.clear();
            }
            TranscriptEvent::Partial { words, .. } => {
                self.partial = carry_forward_first_seen(words, &self.partial);
            }
        }
    }

    /// Words safe to show now: everything final, plus the longest leading run
    /// of partials older than `stability_delay`. A prefix, not a filter, so a
    /// stable later word never leaves a hole behind an unstable earlier one.
    /// `limit` keeps this cheap over a 90 minute service.
    pub fn display_words(&self, now: Instant, limit: Option<usize>) -> Vec<&WordToken> {
        let stable: Vec<&WordToken> = self
            .partial
            .iter()
            .take_while(|w| now.saturating_duration_since(w.first_seen_at) >= self.stability_delay)
            .collect();

        match limit {
            None => self.finalized.iter().chain(stable.iter().copied()).collect(),
            Some(limit) if stable.len() >= limit => stable[stable.len() - limit..].to_vec(),
            Some(limit) => {
                let take = limit - stable.len();
                let start = self.finalized.len().saturating_sub(take);
                self.finalized[start..].iter().chain(stable.iter().copied()).collect()
            }
        }
    }

    pub fn reset(&mut self) {
        self.finalized.clear();
        self.partial.clear();
        self.last_segment_id = 0;
    }
}

/// Keep the original `first_seen_at` for words the new window proposed
/// identically at the same position; otherwise every window would reset each
/// word's age. Matched by position and text, not time: whisper's word times
/// jitter between windows. Once a word differs, later words restart too.
fn carry_forward_first_seen(incoming: Vec<WordToken>, previous: &[WordToken]) -> Vec<WordToken> {
    let mut agreeing = true;
    incoming
        .into_iter()
        .enumerate()
        .map(|(i, mut w)| {
            agreeing = agreeing && previous.get(i).is_some_and(|p| p.text == w.text);
            if agreeing {
                w.first_seen_at = previous[i].first_seen_at;
            }
            w
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn w(text: &str, t: f64, at: Instant) -> WordToken {
        WordToken::new(text, t, at)
    }
    fn texts(words: Vec<&WordToken>) -> Vec<&str> {
        words.into_iter().map(|w| w.text.as_str()).collect()
    }

    #[test]
    fn partial_word_waits_for_stability_delay() {
        let t0 = Instant::now();
        let mut s = Stabilizer::new(Duration::from_millis(400));
        s.ingest(TranscriptEvent::Partial { words: vec![w("grace", 1.0, t0)], window_id: 1 });
        assert!(s.display_words(t0 + Duration::from_millis(100), None).is_empty());
        assert_eq!(texts(s.display_words(t0 + Duration::from_millis(450), None)), ["grace"]);
    }

    #[test]
    fn identical_reproposal_keeps_original_clock_despite_time_jitter() {
        let t0 = Instant::now();
        let mut s = Stabilizer::new(Duration::from_millis(400));
        s.ingest(TranscriptEvent::Partial { words: vec![w("grace", 1.0, t0)], window_id: 1 });
        // Next window re-proposes the same word 300 ms later.
        let t1 = t0 + Duration::from_millis(300);
        s.ingest(TranscriptEvent::Partial { words: vec![w("grace", 1.2, t1)], window_id: 2 });
        assert_eq!(texts(s.display_words(t0 + Duration::from_millis(450), None)), ["grace"]);
    }

    #[test]
    fn changed_word_restarts_clock() {
        let t0 = Instant::now();
        let mut s = Stabilizer::new(Duration::from_millis(400));
        s.ingest(TranscriptEvent::Partial { words: vec![w("grays", 1.0, t0)], window_id: 1 });
        let t1 = t0 + Duration::from_millis(300);
        s.ingest(TranscriptEvent::Partial { words: vec![w("grace", 1.0, t1)], window_id: 2 });
        assert!(s.display_words(t0 + Duration::from_millis(450), None).is_empty());
    }

    #[test]
    fn unstable_word_blocks_later_stable_ones() {
        let t0 = Instant::now();
        let mut s = Stabilizer::new(Duration::from_millis(400));
        s.ingest(TranscriptEvent::Partial {
            words: vec![w("new", 1.0, t0 + Duration::from_millis(400)), w("old", 2.0, t0)],
            window_id: 1,
        });
        assert!(s.display_words(t0 + Duration::from_millis(500), None).is_empty());
    }

    #[test]
    fn finalized_drops_covered_partials_and_duplicates() {
        let t0 = Instant::now();
        let mut s = Stabilizer::new(Duration::ZERO);
        s.ingest(TranscriptEvent::Partial {
            words: vec![w("amazing", 1.0, t0), w("grace", 2.0, t0)],
            window_id: 1,
        });
        s.ingest(TranscriptEvent::Finalized { words: vec![w("amazing", 1.0, t0)], segment_id: 1 });
        s.ingest(TranscriptEvent::Partial { words: vec![w("grace", 2.0, t0)], window_id: 2 });
        // Redelivered segment is ignored.
        s.ingest(TranscriptEvent::Finalized { words: vec![w("amazing", 1.0, t0)], segment_id: 1 });
        assert_eq!(texts(s.display_words(t0, None)), ["amazing", "grace"]);
    }

    #[test]
    fn limit_returns_only_the_tail() {
        let t0 = Instant::now();
        let mut s = Stabilizer::new(Duration::ZERO);
        s.ingest(TranscriptEvent::Finalized {
            words: vec![w("a", 1.0, t0), w("b", 2.0, t0), w("c", 3.0, t0)],
            segment_id: 1,
        });
        s.ingest(TranscriptEvent::Partial { words: vec![w("d", 4.0, t0)], window_id: 1 });
        assert_eq!(texts(s.display_words(t0, Some(2))), ["c", "d"]);
    }
}
