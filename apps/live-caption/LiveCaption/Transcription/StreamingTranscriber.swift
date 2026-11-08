import Foundation

/// Drives whisper.cpp over a live audio stream using overlapping sliding
/// windows, and turns its per-window output into a `TranscriptEvent` stream:
/// `.partial` for words that may still change, `.finalized` for words that
/// structurally can never be re-transcribed again.
///
/// Conforms to `AudioSourceDelegate` so it can sit directly downstream of
/// either `CoreAudioSource` or `NDIAudioSource` — whichever is active, this
/// class doesn't know or care which.
/// `@unchecked Sendable`: mutable state (`buffer`, `pendingWords`, etc.) is
/// only ever touched from `processingQueue`, which the compiler can't verify
/// on its own — every entry point that mutates state dispatches through it.
final class StreamingTranscriber: AudioSourceDelegate, @unchecked Sendable {
    private let engine: WhisperEngine
    /// Optional speech gate. Nil means every window is transcribed as-is (no
    /// VAD model installed, or the operator turned filtering off).
    private let speechDetector: SpeechDetector?
    /// How far outside a detected speech range a word's start may fall and
    /// still be kept. Whisper's word times are approximate.
    private let speechTolerance: TimeInterval = 0.6
    private let vocabularyPrompt: () -> String
    private let onEvent: (TranscriptEvent) -> Void
    private let onFailure: (AudioSourceError) -> Void

    /// Length of each inference window.
    private let windowLength: TimeInterval = 10.0
    /// How far the window advances between runs.
    private let strideLength: TimeInterval = 3.5
    /// Trailing audio re-included at the start of the next window, giving
    /// whisper.cpp acoustic context across the boundary and reducing
    /// boundary-cut errors. Derived, not independently configurable.
    private var overlapDuration: TimeInterval { max(0, windowLength - strideLength) }
    /// Words in a window's last this-many seconds stay provisional; anything
    /// earlier is finalized. Whisper is least reliable at a window's edges —
    /// the first second may start mid-word, the last may be cut off — so
    /// words are locked in from the *middle* of the window, where they have
    /// audio on both sides. Must leave at least `strideLength` of window
    /// before it, so consecutive windows' finalized stretches meet.
    private let finalizationLookahead: TimeInterval = 3.0
    /// The last few finalized words, used to find where the next window's
    /// text picks up (see `newContentStart`).
    private var finalizedTail: [WordToken] = []

    /// Ring buffer of resampled 16kHz mono samples not yet dropped from the
    /// working window. `bufferStartTime` is the stream-relative time (in the
    /// clock domain of `PCMFrame.hostTimestamp`) of `buffer[0]`.
    private var buffer: [Float] = []
    private var bufferStartTime: TimeInterval?
    private let sampleRate: Double = 16_000

    private var windowCounter = 0
    private var segmentCounter = 0
    /// The most recent window's still-unfinalized words, replaced wholesale
    /// by each new window run (see the note on reconciliation below).
    private var pendingWords: [WordToken] = []

    private let processingQueue = DispatchQueue(label: "uk.destinytees.livecaption.transcriber", qos: .userInitiated)

    init(
        engine: WhisperEngine,
        speechDetector: SpeechDetector? = nil,
        vocabularyPrompt: @escaping () -> String,
        onEvent: @escaping (TranscriptEvent) -> Void,
        onFailure: @escaping (AudioSourceError) -> Void = { _ in }
    ) {
        self.engine = engine
        self.speechDetector = speechDetector
        self.vocabularyPrompt = vocabularyPrompt
        self.onEvent = onEvent
        self.onFailure = onFailure
    }

    // MARK: - AudioSourceDelegate

    func audioSource(_ source: any AudioSource, didProduce frame: PCMFrame) {
        processingQueue.async { [weak self] in
            self?.append(frame)
        }
    }

    func audioSource(_ source: any AudioSource, didFailWith error: AudioSourceError) {
        // The transcriber just stops accumulating; it doesn't own error
        // presentation. `AppState` decides what the operator sees.
        onFailure(error)
    }

    // MARK: - Buffering & window scheduling

    private func append(_ frame: PCMFrame) {
        if bufferStartTime == nil {
            bufferStartTime = frame.hostTimestamp
        }
        buffer.append(contentsOf: frame.samples)

        guard let bufferStartTime else { return }
        let bufferedDuration = Double(buffer.count) / sampleRate

        guard bufferedDuration >= windowLength else { return }

        let windowStart = bufferStartTime + (bufferedDuration - windowLength)
        runWindow(startingAt: windowStart)

        // Drop everything before the *next* window's start (one stride
        // forward) so the buffer doesn't grow unboundedly over a full
        // service — the overlap we still need is retained since the next
        // window starts `strideLength` after this one, which is less than
        // `windowLength`.
        let nextWindowStart = windowStart + strideLength
        let sampleOffsetToDrop = Int((nextWindowStart - bufferStartTime) * sampleRate)
        if sampleOffsetToDrop > 0, sampleOffsetToDrop < buffer.count {
            buffer.removeFirst(sampleOffsetToDrop)
            self.bufferStartTime = nextWindowStart
        }
    }

    private func runWindow(startingAt windowStart: TimeInterval) {
        let windowSampleCount = Int(windowLength * sampleRate)
        guard buffer.count >= windowSampleCount else { return }
        let windowSamples = Array(buffer.suffix(windowSampleCount))

        windowCounter += 1
        let currentWindowID = windowCounter

        // nil: no detector, or detection failed — transcribe the window as
        // is rather than risk dropping real speech.
        let speechRanges = speechDetector?.speechRanges(in: windowSamples)
        if let speechRanges, speechRanges.isEmpty {
            // Applause, music, silence: nothing to transcribe. Still
            // reconciled, so words already pending are finalized on time.
            reconcile(words: [], windowStart: windowStart, windowID: currentWindowID)
            return
        }

        do {
            var rawTokens = try engine.transcribe(samples: windowSamples, initialPrompt: vocabularyPrompt())
            if let speechRanges {
                rawTokens.removeAll { token in
                    !TranscriptCleaner.isWithinSpeech(token.startTime, ranges: speechRanges, tolerance: speechTolerance)
                }
            }
            // Offset whisper.cpp's window-relative timestamps to
            // stream-absolute time.
            let words = rawTokens.map { token in
                WordToken(text: token.text, startTime: windowStart + token.startTime, confidence: token.confidence)
            }
            reconcile(words: words, windowStart: windowStart, windowID: currentWindowID)
        } catch {
            // A single failed window shouldn't take down the stream — the
            // next window's overlap will very likely recover the missed
            // audio. Logged, not surfaced as a hard error.
        }
    }

    /// Merges a new window's output with what's already been finalized.
    ///
    /// Consecutive windows share most of their audio, so each new window
    /// re-transcribes words that are already final. Telling old words from
    /// new ones by timestamp alone doesn't work: whisper.cpp's word times
    /// drift by a few hundred ms between windows, so a word near the seam
    /// either lands on both sides (shown twice) or neither (lost). Instead the
    /// new window is aligned on *text*: find the finalized tail ("carrying a
    /// lot") in the new window's words, and everything after it is new.
    /// Timestamps only break ties and serve as the fallback.
    private func reconcile(words: [WordToken], windowStart: TimeInterval, windowID: Int) {
        let newFinalizationCutoff = windowStart + windowLength - finalizationLookahead

        let start = Self.newContentStart(in: words, afterFinalized: finalizedTail)
        let fresh = words[start...]
        let newlyFinalized = Array(fresh.prefix { $0.startTime < newFinalizationCutoff })
        let stillPending = Array(fresh.dropFirst(newlyFinalized.count))

        if !newlyFinalized.isEmpty {
            segmentCounter += 1
            onEvent(.finalized(FinalizedSegment(words: newlyFinalized, segmentID: segmentCounter)))
            finalizedTail = Array((finalizedTail + newlyFinalized).suffix(8))
        }

        pendingWords = stillPending
        onEvent(.partial(PartialHypothesis(words: stillPending, windowID: windowID)))
    }

    /// How far (seconds) a re-transcribed word's time may drift and still be
    /// matched to the finalized word it repeats.
    static let alignmentTolerance: TimeInterval = 1.5

    /// Index in `words` where text that hasn't been finalized yet begins.
    ///
    /// Looks for the last few finalized words (longest match first) in the new
    /// window, close to where they were originally heard. A single-word match
    /// ("the") is only trusted when it's very close in time. With no match —
    /// after a silence, or when the new window heard the seam differently —
    /// falls back to the first word after the last finalized one.
    static func newContentStart(in words: [WordToken], afterFinalized tail: [WordToken]) -> Int {
        let keys = words.map { alignmentKey($0.text) }
        let tailKeys = tail.map { alignmentKey($0.text) }

        if let lastFinalizedTime = tail.last?.startTime {
            for length in stride(from: min(4, tailKeys.count), through: 1, by: -1) {
                let needle = Array(tailKeys.suffix(length))
                guard needle.contains(where: { !$0.isEmpty }) else { continue }
                let tolerance = length == 1 ? 0.6 : alignmentTolerance
                for index in stride(from: words.count - length, through: 0, by: -1) {
                    let last = index + length - 1
                    guard abs(words[last].startTime - lastFinalizedTime) <= tolerance,
                          keys[index...last].elementsEqual(needle) else { continue }
                    return last + 1
                }
            }
        }
        // Go by the last word actually finalized, not by how far the cutoff
        // has advanced: whisper sometimes skips a half-sentence at the start
        // of a window, and if the next window hears it, it must be kept.
        let resumeAfter = tail.last.map { $0.startTime + 0.1 } ?? -.infinity
        return words.firstIndex { $0.startTime > resumeAfter } ?? words.count
    }

    /// Case- and punctuation-insensitive form of a word for alignment, so
    /// "lot." in one window matches "lot," in the next.
    static func alignmentKey(_ text: String) -> String {
        String(text.lowercased().unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) }.map(Character.init))
    }
}
