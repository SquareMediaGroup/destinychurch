//! The speech-to-text seam. The transcriber only knows this trait, so a
//! whisper backend, a backup engine, or a test fake all plug in the same way.

use std::fmt;

/// One word as the engine reports it for a single window.
#[derive(Debug, Clone, PartialEq)]
pub struct RawWord {
    pub text: String,
    /// Seconds from the start of the window passed to `transcribe`.
    pub start: f64,
    pub confidence: Option<f32>,
}

#[derive(Debug)]
pub struct SpeechError(pub String);

impl fmt::Display for SpeechError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "speech engine error: {}", self.0)
    }
}

impl std::error::Error for SpeechError {}

pub trait SpeechEngine: Send {
    /// Transcribe 16 kHz mono f32 samples. `initial_prompt` biases decoding
    /// toward names and places (see `vocabulary`).
    fn transcribe(&mut self, samples: &[f32], initial_prompt: &str) -> Result<Vec<RawWord>, SpeechError>;
}

impl SpeechEngine for Box<dyn SpeechEngine> {
    fn transcribe(&mut self, samples: &[f32], initial_prompt: &str) -> Result<Vec<RawWord>, SpeechError> {
        (**self).transcribe(samples, initial_prompt)
    }
}
