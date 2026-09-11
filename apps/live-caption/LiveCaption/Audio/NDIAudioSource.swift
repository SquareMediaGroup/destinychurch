import AVFoundation
import Foundation

/// Receives audio from an NDI source on the network. Requests audio-only
/// bandwidth so the SDK never negotiates video from a mixed source (e.g. an
/// ATEM program feed) in the first place; as a defense-in-depth backstop, any
/// video frame that arrives anyway is discarded immediately without further
/// processing — see `captureLoop()`.
///
/// The NDI SDK's receive call (`NDIlib_recv_capture_v3`) is a blocking poll,
/// not a callback API, so this runs its own dedicated `Thread` rather than
/// hopping onto a `DispatchQueue` — the same reasoning `CoreAudioSource`
/// applies to its realtime render thread.
final class NDIAudioSource: AudioSource {
    weak var delegate: AudioSourceDelegate?
    private(set) var isRunning = false

    private let sourceName: String
    private var receiverInstance: NDIlib_recv_instance_t?
    private var captureThread: Thread?
    private var resampler: AudioResampler?
    private var consecutiveTimeouts = 0

    /// Timeouts allowed before treating the source as gone. NDI's capture
    /// call is polled at ~5s intervals below; ~4 consecutive timeouts is a
    /// good default balance between not flapping on a brief network hiccup
    /// and not silently stalling for a full minute during a live service.
    private static let maxConsecutiveTimeouts = 4

    init(sourceName: String) {
        self.sourceName = sourceName
    }

    /// Enumerates NDI sources currently visible on the network. Call
    /// alongside `AudioDeviceDiscovery.coreAudioInputDevices()` to build one
    /// unified source list for the UI.
    static func discoverSources(waitSeconds: UInt32 = 2) -> [DiscoveredAudioSource] {
        guard let finder = NDIlib_find_create_v2(nil) else { return [] }
        defer { NDIlib_find_destroy(finder) }

        _ = NDIlib_find_wait_for_sources(finder, waitSeconds * 1000)

        var count: UInt32 = 0
        guard let sourcesPointer = NDIlib_find_get_current_sources(finder, &count) else { return [] }

        return (0..<Int(count)).compactMap { index in
            let source = sourcesPointer[index]
            guard let namePointer = source.p_ndi_name, let name = String(validatingUTF8: namePointer) else {
                return nil
            }
            let urlAddress = source.p_url_address.flatMap { String(validatingUTF8: $0) } ?? ""
            return .ndi(sourceName: name, urlAddress: urlAddress)
        }
    }

    func start() throws {
        guard !isRunning else { return }

        guard let source = Self.discoverSources().first(where: { $0.displayName == sourceName }) else {
            throw AudioSourceError.deviceUnavailable
        }

        var ndiSource = NDIlib_source_t()
        sourceName.withCString { ndiSource.p_ndi_name = strdup($0) }

        var createSettings = NDIlib_recv_create_v3_t()
        createSettings.source_to_connect_to = ndiSource
        createSettings.color_format = NDIlib_recv_color_format_fastest
        // Audio-only bandwidth: the SDK should never even negotiate video
        // frames from a mixed source (Risk #3 in the scope doc — NDI sources
        // that also carry video, e.g. a program feed, have real overhead we
        // don't want to pay for a caption pipeline that only needs audio).
        createSettings.bandwidth = NDIlib_recv_bandwidth_audio_only
        createSettings.allow_video_fields = false

        guard let receiver = NDIlib_recv_create_v3(&createSettings) else {
            throw AudioSourceError.deviceUnavailable
        }
        receiverInstance = receiver

        let inputFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 48_000, channels: 1, interleaved: false)!
        guard let resampler = AudioResampler(inputFormat: inputFormat) else {
            NDIlib_recv_destroy(receiver)
            receiverInstance = nil
            throw AudioSourceError.formatNegotiationFailed
        }
        self.resampler = resampler

        isRunning = true
        consecutiveTimeouts = 0

        let thread = Thread { [weak self] in self?.captureLoop() }
        thread.name = "NDIAudioSource.capture"
        thread.qualityOfService = .userInteractive
        captureThread = thread
        thread.start()
    }

    func stop() {
        guard isRunning else { return }
        isRunning = false
        captureThread = nil
        if let receiver = receiverInstance {
            NDIlib_recv_destroy(receiver)
            receiverInstance = nil
        }
    }

    private func captureLoop() {
        guard let receiver = receiverInstance else { return }

        while isRunning {
            var videoFrame = NDIlib_video_frame_v2_t()
            var audioFrame = NDIlib_audio_frame_v3_t()
            var metadataFrame = NDIlib_metadata_frame_t()

            let frameType = NDIlib_recv_capture_v3(receiver, &videoFrame, &audioFrame, &metadataFrame, 5000)

            switch frameType {
            case NDIlib_frame_type_audio:
                consecutiveTimeouts = 0
                handleAudioFrame(audioFrame)
                NDIlib_recv_free_audio_v3(receiver, &audioFrame)

            case NDIlib_frame_type_video:
                // Defensive discard: bandwidth mode is audio_only, but if a
                // source ignores that we must never process video frames.
                NDIlib_recv_free_video_v2(receiver, &videoFrame)

            case NDIlib_frame_type_metadata:
                NDIlib_recv_free_metadata(receiver, &metadataFrame)

            case NDIlib_frame_type_none:
                consecutiveTimeouts += 1
                if consecutiveTimeouts >= Self.maxConsecutiveTimeouts {
                    delegate?.audioSource(self, didFailWith: .ndiConnectionLost)
                    consecutiveTimeouts = 0
                }

            default:
                break
            }
        }
    }

    private func handleAudioFrame(_ frame: NDIlib_audio_frame_v3_t) {
        guard let dataPointer = frame.p_data else { return }

        let sampleCount = Int(frame.no_samples)
        let channelCount = Int(frame.no_channels)
        guard sampleCount > 0, channelCount > 0 else { return }

        // NDI delivers planar float audio (channel stride = frame.channel_stride_in_bytes).
        // Downmix to mono by channel-averaging — configurable per-channel selection can
        // follow later if a specific source needs it.
        let stride = Int(frame.channel_stride_in_bytes) / MemoryLayout<Float>.size
        let base = dataPointer.withMemoryRebound(to: Float.self, capacity: stride * channelCount) { $0 }

        var mono = [Float](repeating: 0, count: sampleCount)
        for channel in 0..<channelCount {
            let channelStart = base + channel * stride
            for i in 0..<sampleCount {
                mono[i] += channelStart[i]
            }
        }
        let scale = 1.0 / Float(channelCount)
        for i in 0..<sampleCount { mono[i] *= scale }

        guard let inputBuffer = AVAudioPCMBuffer(
            pcmFormat: AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: Double(frame.sample_rate), channels: 1, interleaved: false)!,
            frameCapacity: AVAudioFrameCount(sampleCount)
        ) else { return }
        inputBuffer.frameLength = AVAudioFrameCount(sampleCount)
        mono.withUnsafeBufferPointer { pointer in
            inputBuffer.floatChannelData?[0].update(from: pointer.baseAddress!, count: sampleCount)
        }

        guard let resampled = resampler?.resample(inputBuffer) else { return }
        let pcmFrame = PCMFrame(samples: resampled, hostTimestamp: Double(frame.timecode) / 10_000_000.0)
        delegate?.audioSource(self, didProduce: pcmFrame)
    }
}
