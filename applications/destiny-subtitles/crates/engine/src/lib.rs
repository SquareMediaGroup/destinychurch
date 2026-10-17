//! Destiny Subtitles engine. No UI or Tauri dependency, so everything here is
//! unit-testable on any machine. Audio capture, whisper and NDI plug in behind
//! these types in later phases.

pub mod format;
pub mod stabilizer;
pub mod vocabulary;
pub mod word;

pub use format::{CaptionFormat, Layout, Reveal};
pub use stabilizer::{Stabilizer, TranscriptEvent};
pub use word::WordToken;
