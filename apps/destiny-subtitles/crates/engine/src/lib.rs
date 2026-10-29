//! Destiny Subtitles engine. No UI or Tauri dependency, so everything here is
//! unit-testable on any machine. Audio capture, whisper and NDI plug in behind
//! these types.

pub mod format;
pub mod ndi;
pub mod render;
pub mod resample;
pub mod speech;
pub mod stabilizer;
pub mod transcriber;
pub mod vocabulary;
pub mod wav;
#[cfg(feature = "whisper")]
pub mod whisper;
pub mod word;

pub use format::{CaptionFormat, Layout, Reveal};
pub use speech::{RawWord, SpeechEngine, SpeechError};
pub use stabilizer::{Stabilizer, TranscriptEvent};
pub use transcriber::StreamingTranscriber;
pub use word::WordToken;
