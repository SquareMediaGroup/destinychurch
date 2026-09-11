import Foundation
import Observation

/// Top-level pipeline wiring: owns the active `AudioSource` and
/// `StreamingTranscriber`, and is the single place that knows how to switch
/// between Core Audio and NDI input. Phase 1 only logs transcript events to
/// the console; Phase 2 adds `CaptionStore` downstream of the same
/// `TranscriptEvent` stream this already produces.
@MainActor
@Observable
final class AppState {
    private(set) var isRunning = false
    private(set) var statusMessage = "Idle"

    private var audioSource: (any AudioSource)?
    private var transcriber: StreamingTranscriber?
    private var engine: WhisperEngine?

    func start(source: DiscoveredAudioSource, modelPath: String) {
        stop()

        do {
            let engine = try WhisperEngine(modelPath: modelPath)
            self.engine = engine

            let transcriber = StreamingTranscriber(
                engine: engine,
                vocabularyPrompt: { VocabularyPrompt.build(preamble: "", vocabulary: VocabularyPrompt.defaultVocabulary) },
                onEvent: { [weak self] event in
                    Task { @MainActor in self?.handle(event) }
                }
            )
            self.transcriber = transcriber

            let audioSource = try Self.makeAudioSource(for: source)
            audioSource.delegate = transcriber
            try audioSource.start()
            self.audioSource = audioSource

            isRunning = true
            statusMessage = "Running — \(source.displayName)"
        } catch {
            statusMessage = "Failed to start: \(error)"
        }
    }

    func stop() {
        audioSource?.stop()
        audioSource = nil
        transcriber = nil
        engine = nil
        isRunning = false
        statusMessage = "Idle"
    }

    private func handle(_ event: TranscriptEvent) {
        switch event {
        case .partial(let hypothesis):
            let text = hypothesis.words.map(\.text).joined(separator: " ")
            print("[partial \(hypothesis.windowID)] \(text)")
        case .finalized(let segment):
            let text = segment.words.map(\.text).joined(separator: " ")
            print("[final   \(segment.segmentID)] \(text)")
        }
    }

    private static func makeAudioSource(for source: DiscoveredAudioSource) throws -> any AudioSource {
        switch source {
        case .coreAudio(let deviceID, _):
            return CoreAudioSource(deviceID: deviceID)
        case .ndi(let sourceName, _):
            return NDIAudioSource(sourceName: sourceName)
        }
    }
}
