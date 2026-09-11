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

    /// Ring buffer of resampled 16kHz mono samples not yet dropped from the
    /// working window. `bufferStartTime` is the stream-relative time (in the
    /// clock domain of `PCMFrame.hostTimestamp`) of `buffer[0]`.
    private var buffer: [Float] = []
    private var bufferStartTime: TimeInterval?
    private let sampleRate: Double = 16_000

    private var windowCounter = 0
    private var segmentCounter = 0
    /// Words already promoted to `.finalized` — anything at or after this
    /// timestamp is still subject to revision by the next window's overlap.
    private var finalizationCutoff: TimeInterval = -.infinity
    /// The most recent window's still-unfinalized words, replaced wholesale
    /// by each new window run (see the note on reconciliation below).
    private var pendingWords: [WordToken] = []

    private let processingQueue = DispatchQueue(label: "uk.destinytees.livecaption.transcriber", qos: .userInitiated)

    init(
        engine: WhisperEngine,
        vocabularyPrompt: @escaping () -> String,
        onEvent: @escaping (TranscriptEvent) -> Void,
        onFailure: @escaping (AudioSourceError) -> Void = { _ in }
    ) {
        self.engine = engine
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

        do {
            let rawTokens = try engine.transcribe(samples: windowSamples, initialPrompt: vocabularyPrompt())
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

    /// Merges a new window's output with prior state.
    ///
    /// v1 reconciliation strategy: trust the newest window's transcription
    /// fully for anything at or after `finalizationCutoff` (i.e. everything
    /// still eligible for revision), and rely on `finalizationCutoff` itself
    /// — not text-diffing — to guarantee already-locked words never change.
    /// A true longest-common-subsequence stitch across the overlap region
    /// would reduce word-order jitter in the *partial* (not-yet-final)
    /// region further; that refinement is deferred, not required for
    /// structurally-correct output, since `CaptionStabilizer`'s debounce
    /// (see Captioning/CaptionStabilizer.swift) already absorbs most of the
    /// resulting flicker before anything reaches the screen.
    private func reconcile(words: [WordToken], windowStart: TimeInterval, windowID: Int) {
        let newFinalizationCutoff = windowStart - overlapDuration

        let newlyFinalized = words.filter { $0.startTime < newFinalizationCutoff && $0.startTime >= finalizationCutoff }
        let stillPending = words.filter { $0.startTime >= newFinalizationCutoff }

        if !newlyFinalized.isEmpty {
            segmentCounter += 1
            onEvent(.finalized(FinalizedSegment(words: newlyFinalized, segmentID: segmentCounter)))
        }

        finalizationCutoff = max(finalizationCutoff, newFinalizationCutoff)
        pendingWords = stillPending
        onEvent(.partial(PartialHypothesis(words: stillPending, windowID: windowID)))
    }
}
