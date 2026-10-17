import Foundation
import Observation

/// Top-level pipeline wiring: owns the active `AudioSource`, the
/// `StreamingTranscriber`, the `CaptionStore` every display reads from, and
/// the optional NDI output. This is the single place that knows how to switch
/// between Core Audio and NDI input, and the only place the whole pipeline is
/// assembled or torn down.
@MainActor
@Observable
final class AppState {
    private(set) var isRunning = false
    private(set) var statusMessage = "Idle"
    /// Set when the pipeline fails in a way an operator must see mid-service
    /// (input device unplugged, NDI source vanished). Cleared on next start.
    private(set) var alertMessage: String?

    let captionStore: CaptionStore
    let preferences: Preferences

    private(set) var availableSources: [DiscoveredAudioSource] = []
    private(set) var availableModels: [WhisperModel] = []
    private(set) var isDiscoveringSources = false

    /// The NDI sources currently on air, by configuration name — shown on the
    /// control panel so an operator can confirm at a glance that what they
    /// expect downstream is actually being published.
    private(set) var liveNDIOutputNames: [String] = []

    private var audioSource: (any AudioSource)?
    private var transcriber: StreamingTranscriber?
    private var engine: WhisperEngine?
    private var ndiPublishers: [NDIOutputPublisher] = []

    init(preferences: Preferences = Preferences()) {
        self.preferences = preferences
        self.captionStore = CaptionStore(stabilityDelay: preferences.stabilityDelay)
        self.captionStore.maxDisplayWords = preferences.maxDisplayWords
    }

    // MARK: - Discovery

    /// NDI discovery blocks for a couple of seconds waiting for sources to
    /// announce themselves, so this stays off the main thread — an operator
    /// refreshing the list shouldn't freeze the UI.
    func refreshSources() {
        guard !isDiscoveringSources else { return }
        isDiscoveringSources = true

        let coreAudioSources = AudioDeviceDiscovery.coreAudioInputDevices()

        Task {
            let ndiSources = await Task.detached { NDIAudioSource.discoverSources() }.value
            self.availableSources = coreAudioSources + ndiSources
            self.isDiscoveringSources = false
        }
    }

    func refreshModels() {
        availableModels = ModelCatalog.availableModels()

        // A model path remembered from a previous run may point at a file
        // that's since been deleted or moved to another machine.
        if !preferences.modelPath.isEmpty,
           !FileManager.default.fileExists(atPath: preferences.modelPath) {
            preferences.modelPath = ""
        }
        if preferences.modelPath.isEmpty, let first = availableModels.first {
            preferences.modelPath = first.url.path
        }
    }

    // MARK: - Pipeline lifecycle

    func start(source: DiscoveredAudioSource) {
        stop()
        alertMessage = nil

        let modelPath = preferences.modelPath
        guard !modelPath.isEmpty, FileManager.default.fileExists(atPath: modelPath) else {
            statusMessage = "No model selected"
            alertMessage = "Select a whisper.cpp model before starting."
            return
        }

        do {
            let engine = try WhisperEngine(modelPath: modelPath)
            self.engine = engine

            let vocabulary = preferences.effectiveVocabulary
            let transcriber = StreamingTranscriber(
                engine: engine,
                vocabularyPrompt: { VocabularyPrompt.build(preamble: "", vocabulary: vocabulary) },
                onEvent: { [weak self] event in
                    Task { @MainActor in self?.captionStore.ingest(event) }
                },
                onFailure: { [weak self] error in
                    Task { @MainActor in self?.handleSourceFailure(error) }
                }
            )
            self.transcriber = transcriber

            let audioSource = Self.makeAudioSource(for: source)
            audioSource.delegate = transcriber
            try audioSource.start()
            self.audioSource = audioSource

            captionStore.stabilityDelay = preferences.stabilityDelay
            captionStore.maxDisplayWords = preferences.maxDisplayWords
            captionStore.start()

            startNDIOutputs()

            isRunning = true
            statusMessage = "Running — \(source.displayName)"
        } catch {
            stop()
            statusMessage = "Failed to start"
            alertMessage = Self.describe(error)
        }
    }

    func stop() {
        audioSource?.stop()
        audioSource = nil
        transcriber = nil
        engine = nil

        captionStore.stop()
        stopNDIOutputs()

        isRunning = false
        statusMessage = "Idle"
    }

    // MARK: - NDI output

    /// Can be toggled mid-service without interrupting transcription — the
    /// publishers are independent of the audio and inference path.
    func setNDIOutputEnabled(_ enabled: Bool) {
        preferences.ndiOutputEnabled = enabled
        guard isRunning else { return }
        restartNDIOutputs()
    }

    /// Picks up edits to the output list (a renamed source, a new one, a
    /// changed resolution) without interrupting transcription.
    func restartNDIOutputs() {
        guard isRunning else { return }
        stopNDIOutputs()
        startNDIOutputs()
    }

    private func startNDIOutputs() {
        let configurations = preferences.activeNDIOutputs
        guard !configurations.isEmpty else { return }

        var started: [NDIOutputPublisher] = []
        var failures: [String] = []

        for configuration in configurations {
            let publisher = NDIOutputPublisher(configuration: configuration)
            do {
                try publisher.start()
                publisher.update(text: captionStore.displayText)
                started.append(publisher)
            } catch {
                // One bad output (a duplicate source name, say) must not take
                // the others down with it.
                failures.append(configuration.name)
            }
        }

        ndiPublishers = started
        liveNDIOutputNames = configurations
            .filter { !failures.contains($0.name) }
            .map(\.name)

        captionStore.onDisplayTextChanged = { [weak self] text in
            guard let self else { return }
            for publisher in self.ndiPublishers {
                publisher.update(text: text)
            }
        }

        if !failures.isEmpty {
            alertMessage = "Could not start NDI output\(failures.count > 1 ? "s" : "") \(failures.joined(separator: ", ")). Another source on the network may already be using that name."
        }
    }

    private func stopNDIOutputs() {
        captionStore.onDisplayTextChanged = nil
        for publisher in ndiPublishers {
            publisher.stop()
        }
        ndiPublishers = []
        liveNDIOutputNames = []
    }

    // MARK: - Failures

    private func handleSourceFailure(_ error: AudioSourceError) {
        // The audio path is gone, so transcription has silently stalled —
        // never let that look like a quiet speaker. Tear down and say so.
        stop()
        statusMessage = "Stopped — input lost"
        alertMessage = Self.describe(error)
    }

    private static func describe(_ error: any Error) -> String {
        switch error {
        case AudioSourceError.deviceUnavailable:
            "The selected audio input is no longer available. Check the device is still connected, then start again."
        case AudioSourceError.permissionDenied:
            "Live Caption needs microphone access to capture audio. Grant it in System Settings > Privacy & Security > Microphone."
        case AudioSourceError.ndiConnectionLost:
            "Lost contact with the NDI source. Check the sender is still online, then start again."
        case AudioSourceError.formatNegotiationFailed:
            "Could not read audio in a usable format from this input."
        case WhisperEngine.EngineError.modelLoadFailed:
            "Could not load the whisper model. The file may be incomplete or not a ggml model."
        case WhisperEngine.EngineError.stateInitFailed:
            "Could not initialise the transcription engine."
        case NDIOutputError.senderCreationFailed:
            "Could not create the NDI output source. Another app may already be publishing under this name."
        default:
            String(describing: error)
        }
    }

    private static func makeAudioSource(for source: DiscoveredAudioSource) -> any AudioSource {
        switch source {
        case .coreAudio(let deviceID, _):
            CoreAudioSource(deviceID: deviceID)
        case .ndi(let sourceName, _):
            NDIAudioSource(sourceName: sourceName)
        }
    }
}
