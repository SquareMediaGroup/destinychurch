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
        // Word times from whisper's default timestamp tokens slide into
        // silence by several seconds after a pause, which breaks stitching
        // overlapping windows together (words repeated or lost at the seam).
        // DTW alignment on the model's attention heads is far more accurate.
        // It needs the head set for the specific model, so it's only turned
        // on for models we can identify by filename.
        if let preset = Self.alignmentHeadsPreset(forModelAt: modelPath) {
            params.dtw_token_timestamps = true
            params.dtw_aheads_preset = preset
            params.flash_attn = false
        }

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

    /// whisper.cpp's alignment-head preset for a `ggml-<name>.bin` model, or
    /// nil for a model it has no preset for (quantised variants such as
    /// `ggml-large-v3-turbo-q5_0.bin` share their base model's heads).
    static func alignmentHeadsPreset(forModelAt path: String) -> whisper_alignment_heads_preset? {
        let name = URL(fileURLWithPath: path).deletingPathExtension().lastPathComponent.lowercased()
        let presets: [(String, whisper_alignment_heads_preset)] = [
            ("large-v3-turbo", WHISPER_AHEADS_LARGE_V3_TURBO),
            ("large-v3", WHISPER_AHEADS_LARGE_V3),
            ("large-v2", WHISPER_AHEADS_LARGE_V2),
            ("large-v1", WHISPER_AHEADS_LARGE_V1),
            ("medium.en", WHISPER_AHEADS_MEDIUM_EN),
            ("medium", WHISPER_AHEADS_MEDIUM),
            ("small.en", WHISPER_AHEADS_SMALL_EN),
            ("small", WHISPER_AHEADS_SMALL),
            ("base.en", WHISPER_AHEADS_BASE_EN),
            ("base", WHISPER_AHEADS_BASE),
            ("tiny.en", WHISPER_AHEADS_TINY_EN),
            ("tiny", WHISPER_AHEADS_TINY),
        ]
        // Longest names first in the list, so "large-v3-turbo" wins over "large-v3".
        return presets.first { name.hasPrefix("ggml-\($0.0)") }?.1
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
        // Each window must be decoded on its own. With context on, whisper.cpp
        // keeps the previous window's text in `state` and feeds it back as
        // the prompt — but consecutive windows share most of their audio
        // (`StreamingTranscriber`'s overlap), so the prompt already contains
        // what's being said, the model copies it, and the copy compounds
        // window over window into the same lines repeating forever. The
        // vocabulary `initial_prompt` below is still applied every window.
        params.no_context = true
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
                    // centiseconds -> seconds; DTW time when it was computed.
                    startTime: TimeInterval(tokenData.t_dtw >= 0 ? tokenData.t_dtw : tokenData.t0) / 100.0,
                    confidence: tokenData.p
                ))
            }

            let segmentWords = TranscriptCleaner.removingRepetitionLoops(
                TranscriptCleaner.removingAnnotations(TranscriptCleaner.words(from: tokens))
            )
            let segmentText = segmentWords.map(\.text).joined(separator: " ")
            guard !TranscriptCleaner.isKnownHallucination(segmentText) else { continue }

            words += segmentWords.map { WordToken(text: $0.text, startTime: $0.startTime, confidence: $0.confidence) }
        }
        return words
    }
}
