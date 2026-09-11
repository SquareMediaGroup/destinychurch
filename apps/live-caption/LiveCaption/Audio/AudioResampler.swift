import AVFoundation

/// Converts audio from whatever format a source captures at into whisper.cpp's
/// required input format: 32-bit float, 16kHz, mono, non-interleaved.
///
/// Each `AudioSource` owns its own instance, configured for that source's
/// native input format — the two sources' native formats differ (a Core Audio
/// device's own sample rate/channel count vs. NDI's), but both produce
/// identical output via this one shared type, which is the actual point of
/// convergence between the two input paths.
final class AudioResampler {
    static let targetFormat = AVAudioFormat(
        commonFormat: .pcmFormatFloat32,
        sampleRate: 16_000,
        channels: 1,
        interleaved: false
    )!

    private let converter: AVAudioConverter
    private let inputFormat: AVAudioFormat

    init?(inputFormat: AVAudioFormat) {
        guard let converter = AVAudioConverter(from: inputFormat, to: Self.targetFormat) else {
            return nil
        }
        self.converter = converter
        self.inputFormat = inputFormat
    }

    /// Resamples one input buffer to 16kHz mono float samples. Returns `nil`
    /// on conversion failure (logged by the caller, not fatal — a single
    /// dropped buffer should not tear down the whole audio pipeline).
    func resample(_ buffer: AVAudioPCMBuffer) -> [Float]? {
        let ratio = Self.targetFormat.sampleRate / inputFormat.sampleRate
        let outputCapacity = AVAudioFrameCount(Double(buffer.frameLength) * ratio) + 16

        guard let outputBuffer = AVAudioPCMBuffer(
            pcmFormat: Self.targetFormat,
            frameCapacity: outputCapacity
        ) else {
            return nil
        }

        var didSupplyInput = false
        var conversionError: NSError?
        let status = converter.convert(to: outputBuffer, error: &conversionError) { _, inputStatus in
            if didSupplyInput {
                inputStatus.pointee = .noDataNow
                return nil
            }
            didSupplyInput = true
            inputStatus.pointee = .haveData
            return buffer
        }

        guard status != .error, let channelData = outputBuffer.floatChannelData else {
            return nil
        }

        let frameCount = Int(outputBuffer.frameLength)
        return Array(UnsafeBufferPointer(start: channelData[0], count: frameCount))
    }
}
