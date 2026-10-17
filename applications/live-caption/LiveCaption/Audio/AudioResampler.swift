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

        var conversionError: NSError?

        // AVAudioConverter's pull-based input block only consumes as many
        // frames as it *requests* on a given pull, not the whole buffer
        // handed back — handing back the same full buffer on every pull
        // silently drops whatever frames it didn't ask for that time.
        // Track a read offset and hand back a sub-buffer of exactly the
        // remaining, unconsumed frames each time.
        var consumedFrames: AVAudioFrameCount = 0
        let totalInputFrames = buffer.frameLength

        // AVAudioConverter.convert(to:) can also return `.haveData` after
        // only partially filling `outputBuffer` — it's a streaming API, and
        // one call is not guaranteed to drain all available input in a
        // single pass. Loop until the converter reports it's out of input or
        // the output buffer is full, accumulating each pass's samples.
        var samples: [Float] = []
        samples.reserveCapacity(Int(outputCapacity))

        while true {
            outputBuffer.frameLength = 0
            let status = converter.convert(to: outputBuffer, error: &conversionError) { requestedCount, inputStatus in
                let remainingFrames = totalInputFrames - consumedFrames
                guard remainingFrames > 0 else {
                    inputStatus.pointee = .noDataNow
                    return nil
                }

                let framesToSupply = min(requestedCount, remainingFrames)
                guard let subBuffer = AVAudioPCMBuffer(
                    pcmFormat: self.inputFormat,
                    frameCapacity: framesToSupply
                ) else {
                    inputStatus.pointee = .noDataNow
                    return nil
                }
                subBuffer.frameLength = framesToSupply

                for channel in 0..<Int(self.inputFormat.channelCount) {
                    guard let source = buffer.floatChannelData?[channel],
                          let destination = subBuffer.floatChannelData?[channel] else { continue }
                    destination.update(from: source.advanced(by: Int(consumedFrames)), count: Int(framesToSupply))
                }

                consumedFrames += framesToSupply
                inputStatus.pointee = .haveData
                return subBuffer
            }

            guard status != .error, let channelData = outputBuffer.floatChannelData else {
                return nil
            }

            let frameCount = Int(outputBuffer.frameLength)
            if frameCount > 0 {
                samples.append(contentsOf: UnsafeBufferPointer(start: channelData[0], count: frameCount))
            }

            if status == .inputRanDry || status == .endOfStream || (status == .haveData && frameCount == 0) {
                break
            }
        }

        return samples
    }
}
