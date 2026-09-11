import Foundation
import Observation

/// The single source of truth for what is currently on screen, shared by the
/// in-app preview, the full-screen caption window, and the NDI output. All
/// three render the same `displayText` so an operator can trust the preview
/// matches what the congregation and the NDI receiver see.
@MainActor
@Observable
final class CaptionStore {
    /// Stable caption text, trimmed to the most recent `maxDisplayWords`.
    private(set) var displayText = ""
    /// Everything finalized so far, for the transcript export.
    private(set) var fullTranscript = ""
    private(set) var isLive = false

    /// How many words to keep on screen. A lower-third caption is typically
    /// two or three lines of roughly ten words.
    var maxDisplayWords = 28 {
        didSet { refresh() }
    }

    var stabilityDelay: TimeInterval {
        get { stabilizer.stabilityDelay }
        set { stabilizer.stabilityDelay = newValue }
    }

    /// Called whenever `displayText` changes, so the NDI publisher can
    /// re-render without polling.
    var onDisplayTextChanged: ((String) -> Void)?

    private let stabilizer: CaptionStabilizer
    private var refreshTimer: Timer?
    /// How much of `stabilizer.finalizedWords` is already in `fullTranscript`,
    /// so the transcript is extended by what's new instead of being rebuilt
    /// from every word on each tick.
    private var transcribedWordCount = 0

    init(stabilityDelay: TimeInterval = 0.4) {
        self.stabilizer = CaptionStabilizer(stabilityDelay: stabilityDelay)
    }

    func ingest(_ event: TranscriptEvent) {
        stabilizer.ingest(event)
        refresh()
    }

    func start() {
        isLive = true
        // Stability is time-based, so words become displayable as the clock
        // advances, not only when a new transcript event lands. Without this
        // tick the last few words of a sentence would sit invisible until the
        // speaker happened to say something else.
        refreshTimer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            Task { @MainActor in self?.refresh() }
        }
    }

    func stop() {
        isLive = false
        refreshTimer?.invalidate()
        refreshTimer = nil
    }

    func clear() {
        stabilizer.reset()
        displayText = ""
        fullTranscript = ""
        transcribedWordCount = 0
        onDisplayTextChanged?("")
    }

    private func refresh() {
        let words = stabilizer.displayWords(limit: maxDisplayWords)
        let text = words.map(\.text).joined(separator: " ")

        if text != displayText {
            displayText = text
            onDisplayTextChanged?(text)
        }

        appendNewlyFinalizedToTranscript()
    }

    private func appendNewlyFinalizedToTranscript() {
        let finalized = stabilizer.finalizedWords
        guard finalized.count > transcribedWordCount else { return }

        let addition = finalized[transcribedWordCount...].map(\.text).joined(separator: " ")
        transcribedWordCount = finalized.count
        guard !addition.isEmpty else { return }

        fullTranscript += fullTranscript.isEmpty ? addition : " " + addition
    }
}
