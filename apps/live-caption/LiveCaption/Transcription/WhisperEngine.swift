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

    private func extractWordTokens(state: OpaquePointer) -> [WordToken] {
        var words: [WordToken] = []
        let segmentCount = whisper_full_n_segments_from_state(state)

        for segmentIndex in 0..<segmentCount {
            let tokenCount = whisper_full_n_tokens_from_state(state, segmentIndex)
            for tokenIndex in 0..<tokenCount {
                guard let cText = whisper_full_get_token_text_from_state(context, state, segmentIndex, tokenIndex) else {
                    continue
                }
                let text = String(cString: cText).trimmingCharacters(in: .whitespaces)
                // Skip special/control tokens (e.g. [_BEG_], timestamps) —
                // whisper.cpp marks these; a simple bracket check is the
                // common lightweight filter used in its own examples.
                guard !text.isEmpty, !text.hasPrefix("[") else { continue }

                let tokenData = whisper_full_get_token_data_from_state(state, segmentIndex, tokenIndex)
                let startTime = TimeInterval(tokenData.t0) / 100.0 // centiseconds -> seconds
                let confidence = tokenData.p

                words.append(WordToken(text: text, startTime: startTime, confidence: confidence))
            }
        }
        return words
    }
}
