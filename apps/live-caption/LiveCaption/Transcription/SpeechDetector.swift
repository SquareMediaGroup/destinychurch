import Foundation

/// Voice activity detection: finds where in a window someone is actually
/// speaking, using the Silero VAD model through whisper.cpp's VAD API.
///
/// Whisper itself is a speech-to-text model, not a sound classifier. Given a
/// window of applause, music or crowd noise it will often write something
/// anyway — a "[Applause]" label at best, invented words at worst. Silero is
/// a small model trained specifically to tell speech from everything else, so
/// it's the gate: a window with no speech in it is never sent to whisper, and
/// words whisper places well outside any speech are dropped.
///
/// Not thread-safe; `StreamingTranscriber` only calls it from its own
/// processing queue.
final class SpeechDetector {
    private var context: OpaquePointer?
    private let params: whisper_vad_params

    /// - Parameter modelPath: a `ggml-silero-*.bin` VAD model, fetched with
    ///   `Scripts/fetch-whisper-model.sh silero-v5.1.2`.
    init?(modelPath: String) {
        var contextParams = whisper_vad_default_context_params()
        contextParams.n_threads = 2
        // Silero is tiny (under 1MB); the CPU keeps the GPU free for whisper.
        contextParams.use_gpu = false
        guard let context = whisper_vad_init_from_file_with_params(modelPath, contextParams) else {
            return nil
        }
        self.context = context

        var params = whisper_vad_default_params()
        params.threshold = 0.5
        // A cough or a single clap shorter than this isn't speech.
        params.min_speech_duration_ms = 250
        // Don't split a sentence at every breath.
        params.min_silence_duration_ms = 300
        params.speech_pad_ms = 200
        self.params = params
    }

    deinit {
        if let context { whisper_vad_free(context) }
    }

    /// Speech ranges in `samples` (16kHz mono), in seconds from the start of
    /// the buffer. Empty means no speech; nil means detection itself failed,
    /// in which case the caller should fall back to transcribing everything
    /// rather than going silent.
    func speechRanges(in samples: [Float]) -> [ClosedRange<TimeInterval>]? {
        guard let context, !samples.isEmpty else { return nil }

        let segments = samples.withUnsafeBufferPointer { buffer in
            whisper_vad_segments_from_samples(context, params, buffer.baseAddress, Int32(buffer.count))
        }
        guard let segments else { return nil }
        defer { whisper_vad_free_segments(segments) }

        let count = whisper_vad_segments_n_segments(segments)
        return (0..<count).compactMap { index in
            // whisper.cpp reports VAD segment bounds in centiseconds.
            let start = TimeInterval(whisper_vad_segments_get_segment_t0(segments, index)) / 100.0
            let end = TimeInterval(whisper_vad_segments_get_segment_t1(segments, index)) / 100.0
            return end >= start ? start...end : nil
        }
    }
}
