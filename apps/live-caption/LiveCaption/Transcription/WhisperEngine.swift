import Foundation

/// Thin Swift wrapper around whisper.cpp's C API. This is the *only* file
/// (besides the bridging header) that should ever touch `whisper.h` directly
/// — everything else in the app talks to `WordToken`/`PartialHypothesis`.
final class WhisperEngine {
    private var context: OpaquePointer?
    private var state: OpaquePointer?

    enum EngineError: Error {
        case modelLoadFailed
        case stateInitFailed
        case inferenceFailed
    }

    /// - Parameter modelPath: path to a `ggml-*.bin` model file, fetched via
    ///   `Scripts/fetch-whisper-model.sh` — never bundled in the app or repo.
    init(modelPath: String, useMetal: Bool = true) throws {
        var params = whisper_context_default_params()
        params.use_gpu = useMetal

        guard let context = whisper_init_from_file_with_params(modelPath, params) else {
            throw EngineError.modelLoadFailed
        }
        self.context = context

        guard let state = whisper_init_state(context) else {
            whisper_free(context)
            throw EngineError.stateInitFailed
        }
        self.state = state
    }

    deinit {
        if let state { whisper_free_state(state) }
        if let context { whisper_free(context) }
    }

    /// Runs inference on one window of already-resampled (16kHz mono float)
    /// audio and returns word-level tokens with window-relative timestamps.
    /// `StreamingTranscriber` is responsible for offsetting these to
    /// stream-absolute time and for the overlap-reconciliation between
    /// consecutive windows — this method knows nothing about streaming.
    func transcribe(samples: [Float], initialPrompt: String?, language: String = "en") throws -> [WordToken] {
        guard let context, let state else { throw EngineError.inferenceFailed }

        var params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY)
        params.print_progress = false
        params.print_special = false
        params.print_realtime = false
        params.print_timestamps = false
        params.token_timestamps = true
        params.single_segment = false
        params.no_context = false
        // Leave Whisper free to write its own "[Applause]"/"(music)" labels:
        // they're stripped by `TranscriptCleaner`, and with them suppressed
        // the model is pushed to write *words* for non-speech instead.
        params.suppress_nst = false
        let languagePointer: UnsafeMutablePointer<CChar>? = language.withCString { strdup($0) }
        params.language = UnsafePointer(languagePointer)

        if let initialPrompt, !initialPrompt.isEmpty {
            let promptPointer: UnsafeMutablePointer<CChar>? = initialPrompt.withCString { strdup($0) }
            params.initial_prompt = UnsafePointer(promptPointer)
        }

        defer {
            params.language.map { free(UnsafeMutableRawPointer(mutating: $0)) }
            params.initial_prompt.map { free(UnsafeMutableRawPointer(mutating: $0)) }
        }

        let result = samples.withUnsafeBufferPointer { buffer -> Int32 in
            whisper_full_with_state(context, state, params, buffer.baseAddress, Int32(buffer.count))
        }
        guard result == 0 else { throw EngineError.inferenceFailed }

        return extractWordTokens(state: state)
    }

    /// A segment whose no-speech probability is above this is dropped
    /// outright. whisper.cpp's own check (`no_speech_thold`) only fires when
    /// the decode was *also* low-confidence, so a confident hallucination over
    /// applause gets through it; this is stricter, but set high enough that
    /// quiet real speech isn't lost. `SpeechDetector` is the main gate.
    static let noSpeechDropThreshold: Float = 0.8

    private func extractWordTokens(state: OpaquePointer) -> [WordToken] {
        guard let context else { return [] }
        let endOfText = whisper_token_eot(context)
        var words: [WordToken] = []
        let segmentCount = whisper_full_n_segments_from_state(state)

        for segmentIndex in 0..<segmentCount {
            if whisper_full_get_segment_no_speech_prob_from_state(state, segmentIndex) > Self.noSpeechDropThreshold {
                continue
            }

            var tokens: [RawToken] = []
            let tokenCount = whisper_full_n_tokens_from_state(state, segmentIndex)
            for tokenIndex in 0..<tokenCount {
                // Special tokens (timestamps, [_BEG_], end-of-text) all have
                // ids at or above end-of-text. Filtering by id rather than by
                // text means a spoken "[" label is handled by the cleaner,
                // and no real word that happens to start with "[" is lost.
                guard whisper_full_get_token_id_from_state(state, segmentIndex, tokenIndex) < endOfText,
                      let cText = whisper_full_get_token_text_from_state(context, state, segmentIndex, tokenIndex)
                else { continue }

                let bytes = Array(UnsafeBufferPointer(
                    start: UnsafeRawPointer(cText).assumingMemoryBound(to: UInt8.self),
                    count: strlen(cText)
                ))
                let tokenData = whisper_full_get_token_data_from_state(state, segmentIndex, tokenIndex)
                tokens.append(RawToken(
                    bytes: bytes,
                    startTime: TimeInterval(tokenData.t0) / 100.0, // centiseconds -> seconds
                    confidence: tokenData.p
                ))
            }

            let segmentWords = TranscriptCleaner.removingAnnotations(TranscriptCleaner.words(from: tokens))
            let segmentText = segmentWords.map(\.text).joined(separator: " ")
            guard !TranscriptCleaner.isKnownHallucination(segmentText) else { continue }

            words += segmentWords.map { WordToken(text: $0.text, startTime: $0.startTime, confidence: $0.confidence) }
        }
        return words
    }
}
