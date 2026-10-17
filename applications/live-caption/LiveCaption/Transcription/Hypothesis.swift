import Foundation

/// One word as reported by whisper.cpp for a given inference window.
struct WordToken: Sendable, Identifiable, Equatable {
    let id: UUID
    let text: String
    /// Seconds from the start of the *original* audio stream (not the
    /// window) — `StreamingTranscriber` offsets whisper.cpp's window-relative
    /// timestamps by the window's start position before constructing these.
    let startTime: TimeInterval
    let confidence: Float?
    /// Wall-clock time this exact word-at-this-position was first proposed by
    /// any window — used by `CaptionStabilizer`'s stability-delay debounce.
    let firstSeenAt: Date

    init(text: String, startTime: TimeInterval, confidence: Float?, firstSeenAt: Date = Date()) {
        self.id = UUID()
        self.text = text
        self.startTime = startTime
        self.confidence = confidence
        self.firstSeenAt = firstSeenAt
    }

    static func == (lhs: WordToken, rhs: WordToken) -> Bool {
        lhs.text == rhs.text && lhs.startTime == rhs.startTime
    }
}

/// A candidate transcription of the still-in-flight tail of audio. May be
/// entirely replaced by the next window's run — nothing here is guaranteed
/// stable yet. `CaptionStabilizer` is what decides which of these words are
/// safe to actually animate onto the screen.
struct PartialHypothesis: Sendable {
    let words: [WordToken]
    let windowID: Int
}

/// A segment of transcript that can never change again: its audio has fallen
/// behind the sliding window's re-transcription horizon (see
/// `StreamingTranscriber.finalizationHorizon`), so no future window's overlap
/// region will ever reconsider it. This is a structural guarantee, not a
/// heuristic — it's the primary "confirmed" signal `CaptionStabilizer` uses.
struct FinalizedSegment: Sendable {
    let words: [WordToken]
    let segmentID: Int
}

enum TranscriptEvent: Sendable {
    case partial(PartialHypothesis)
    case finalized(FinalizedSegment)
}
