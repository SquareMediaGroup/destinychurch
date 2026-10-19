use std::time::Instant;

/// One word as reported by the speech model for one inference window.
#[derive(Debug, Clone)]
pub struct WordToken {
    pub text: String,
    /// Seconds from the start of the whole audio stream (not the window).
    pub start_time: f64,
    pub confidence: Option<f32>,
    /// When this exact word at this position was first proposed by any window.
    /// The stabilizer's debounce clock.
    pub first_seen_at: Instant,
}

impl WordToken {
    pub fn new(text: impl Into<String>, start_time: f64, now: Instant) -> Self {
        Self { text: text.into(), start_time, confidence: None, first_seen_at: now }
    }
}
