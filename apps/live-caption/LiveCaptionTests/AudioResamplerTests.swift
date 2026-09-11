import AVFoundation
import Testing
@testable import LiveCaption

struct AudioResamplerTests {
    @Test func resamplesToSixteenKilohertzMono() throws {
        let inputFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 48_000, channels: 2, interleaved: false)!
        let resampler = try #require(AudioResampler(inputFormat: inputFormat))

        let frameCount: AVAudioFrameCount = 4800 // 0.1s at 48kHz
        let buffer = try #require(AVAudioPCMBuffer(pcmFormat: inputFormat, frameCapacity: frameCount))
        buffer.frameLength = frameCount
        for channel in 0..<2 {
            for i in 0..<Int(frameCount) {
                buffer.floatChannelData?[channel][i] = Float(sin(Double(i) * 0.1))
            }
        }

        let output = try #require(resampler.resample(buffer))

        // 0.1s of audio at 16kHz should be ~1600 samples (allow conversion slack).
        #expect(abs(output.count - 1600) < 50)
    }

    @Test func handlesEmptyBufferWithoutCrashing() throws {
        let inputFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 16_000, channels: 1, interleaved: false)!
        let resampler = try #require(AudioResampler(inputFormat: inputFormat))
        let buffer = try #require(AVAudioPCMBuffer(pcmFormat: inputFormat, frameCapacity: 1))
        buffer.frameLength = 0

        let output = resampler.resample(buffer)
        #expect(output?.isEmpty != false)
    }
}
