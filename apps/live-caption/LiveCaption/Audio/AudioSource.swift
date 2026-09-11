import Foundation

/// A single chunk of PCM audio already resampled to whisper.cpp's required
/// input format: 32-bit float, 16kHz, mono, non-interleaved.
struct PCMFrame: Sendable {
    let samples: [Float]

    /// Host time (`CACurrentMediaTime()`-domain) at the *start* of this frame,
    /// in the capture device's own clock. Both `CoreAudioSource` and
    /// `NDIAudioSource` must stamp this from the same clock domain so that
    /// end-to-end latency (capture -> finalized caption) can be measured
    /// consistently regardless of which source is active — this is the
    /// instrumentation the latency-drift risk in the scope doc depends on.
    let hostTimestamp: TimeInterval
}

enum AudioSourceError: Error, Sendable {
    case deviceUnavailable
    case formatNegotiationFailed
    case ndiConnectionLost
    case permissionDenied
}

/// Fired from whatever background thread the underlying source drives its
/// I/O on (Core Audio's render thread, or NDI's polling receive loop) — never
/// assume main-thread delivery here. Consumers (`StreamingTranscriber`) are
/// responsible for hopping to whatever queue they need.
protocol AudioSourceDelegate: AnyObject, Sendable {
    func audioSource(_ source: any AudioSource, didProduce frame: PCMFrame)
    func audioSource(_ source: any AudioSource, didFailWith error: AudioSourceError)
}

/// Shared abstraction both audio input paths converge on. A `CoreAudioSource`
/// (Dante interface, BlackHole, any standard input device) and an
/// `NDIAudioSource` (an NDI-audio source on the network) both implement this
/// and both hand `AudioResampler`-normalized `PCMFrame`s to their delegate.
protocol AudioSource: AnyObject {
    var delegate: AudioSourceDelegate? { get set }
    var isRunning: Bool { get }

    func start() throws
    func stop()
}
