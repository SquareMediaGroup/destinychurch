//! whisper.cpp backend (feature `whisper`; add `metal` for the GPU).

use std::path::Path;

use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters, WhisperState};

use crate::speech::{RawWord, SpeechEngine, SpeechError};

pub struct WhisperEngine {
    // The context must outlive the state; both live here.
    _ctx: WhisperContext,
    state: WhisperState,
    language: String,
    threads: i32,
}

impl WhisperEngine {
    pub fn load(model: &Path, language: &str) -> Result<Self, SpeechError> {
        let ctx = WhisperContext::new_with_params(model, WhisperContextParameters::default())
            .map_err(|e| SpeechError(format!("loading {}: {e}", model.display())))?;
        let state = ctx.create_state().map_err(|e| SpeechError(e.to_string()))?;
        let threads = std::thread::available_parallelism().map(|n| n.get() as i32).unwrap_or(4).min(8);
        Ok(Self { _ctx: ctx, state, language: language.to_string(), threads })
    }
}

impl SpeechEngine for WhisperEngine {
    fn transcribe(&mut self, samples: &[f32], initial_prompt: &str) -> Result<Vec<RawWord>, SpeechError> {
        let mut params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
        params.set_n_threads(self.threads);
        params.set_language(Some(&self.language));
        params.set_translate(false);
        params.set_print_special(false);
        params.set_print_progress(false);
        params.set_print_realtime(false);
        params.set_print_timestamps(false);
        // Windows overlap and carry their own prompt, so don't chain context.
        params.set_no_context(true);
        params.set_suppress_blank(true);
        // One segment per word gives per-word start times.
        params.set_token_timestamps(true);
        params.set_max_len(1);
        params.set_split_on_word(true);
        if !initial_prompt.is_empty() {
            params.set_initial_prompt(initial_prompt);
        }

        self.state.full(params, samples).map_err(|e| SpeechError(e.to_string()))?;

        let mut words: Vec<RawWord> = Vec::new();
        for seg in self.state.as_iter() {
            let text = seg.to_str_lossy().map_err(|e| SpeechError(e.to_string()))?;
            let start = seg.start_timestamp() as f64 / 100.0;
            if let Some(w) = accept_segment(&text, start, &mut words) {
                words.push(w);
            }
        }
        Ok(words)
    }
}

/// Turn one single-word segment into a word, a continuation of the previous
/// word (punctuation, "'s"), or nothing (whisper's [BLANK_AUDIO] style tags).
fn accept_segment(text: &str, start: f64, words: &mut [RawWord]) -> Option<RawWord> {
    let trimmed = text.trim();
    if trimmed.is_empty() || is_non_speech_tag(trimmed) {
        return None;
    }
    if !text.starts_with(' ') {
        if let Some(prev) = words.last_mut() {
            prev.text.push_str(trimmed);
            return None;
        }
    }
    Some(RawWord { text: trimmed.to_string(), start, confidence: None })
}

fn is_non_speech_tag(t: &str) -> bool {
    (t.starts_with('[') && t.ends_with(']')) || (t.starts_with('(') && t.ends_with(')')) || t.starts_with("<|")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn continuation_and_tags() {
        let mut words = vec![RawWord { text: "Hello".into(), start: 0.0, confidence: None }];
        assert!(accept_segment(",", 0.4, &mut words).is_none());
        assert_eq!(words[0].text, "Hello,");
        assert!(accept_segment(" [BLANK_AUDIO]", 1.0, &mut words).is_none());
        assert_eq!(accept_segment(" world", 0.5, &mut words).unwrap().text, "world");
    }
}
