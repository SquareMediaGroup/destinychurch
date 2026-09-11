import AVFoundation
import CoreAudio

/// Captures from a standard Core Audio input device — a Dante Virtual
/// Soundcard, BlackHole, or any physical audio interface. No special-casing
/// per device type is needed: they all register as ordinary Core Audio
/// devices and `AVAudioEngine` treats them identically.
final class CoreAudioSource: AudioSource {
    weak var delegate: AudioSourceDelegate?
    private(set) var isRunning = false

    private let deviceID: AudioDeviceID
    private let engine = AVAudioEngine()
    private var resampler: AudioResampler?

    init(deviceID: AudioDeviceID) {
        self.deviceID = deviceID
    }

    func start() throws {
        guard !isRunning else { return }

        try requestMicrophonePermissionIfNeeded()
        try assignInputDevice(deviceID, to: engine)

        let inputNode = engine.inputNode
        let inputFormat = inputNode.outputFormat(forBus: 0)

        guard let resampler = AudioResampler(inputFormat: inputFormat) else {
            throw AudioSourceError.formatNegotiationFailed
        }
        self.resampler = resampler

        inputNode.installTap(onBus: 0, bufferSize: 4096, format: inputFormat) { [weak self] buffer, time in
            guard let self, let samples = self.resampler?.resample(buffer) else { return }
            let frame = PCMFrame(samples: samples, hostTimestamp: time.hostTime.hostTimeToSeconds())
            self.delegate?.audioSource(self, didProduce: frame)
        }

        try engine.start()
        isRunning = true
        observeDeviceDisconnection()
    }

    func stop() {
        guard isRunning else { return }
        engine.inputNode.removeTap(onBus: 0)
        engine.stop()
        isRunning = false
    }

    // MARK: - Permissions

    private func requestMicrophonePermissionIfNeeded() throws {
        switch AVCaptureDevice.authorizationStatus(for: .audio) {
        case .authorized:
            return
        case .notDetermined:
            let semaphore = DispatchSemaphore(value: 0)
            var granted = false
            AVCaptureDevice.requestAccess(for: .audio) { result in
                granted = result
                semaphore.signal()
            }
            semaphore.wait()
            if !granted { throw AudioSourceError.permissionDenied }
        case .denied, .restricted:
            throw AudioSourceError.permissionDenied
        @unknown default:
            throw AudioSourceError.permissionDenied
        }
    }

    // MARK: - Device selection

    private func assignInputDevice(_ deviceID: AudioDeviceID, to engine: AVAudioEngine) throws {
        var mutableDeviceID = deviceID
        let status = AudioUnitSetProperty(
            engine.inputNode.audioUnit!,
            kAudioOutputUnitProperty_CurrentDevice,
            kAudioUnitScope_Global,
            0,
            &mutableDeviceID,
            UInt32(MemoryLayout<AudioDeviceID>.size)
        )
        guard status == noErr else { throw AudioSourceError.deviceUnavailable }
    }

    // MARK: - Hot-plug awareness
    //
    // A Dante interface or the display's own audio path can disconnect mid
    // service. This must surface as a visible operator-facing warning, not a
    // silent stall — the delegate callback is the mechanism; the UI layer
    // (Phase 2) is responsible for actually displaying it.

    private func observeDeviceDisconnection() {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        AudioObjectAddPropertyListenerBlock(AudioObjectID(kAudioObjectSystemObject), &address, .main) { [weak self] _, _ in
            guard let self, self.isRunning else { return }
            if !Self.deviceExists(self.deviceID) {
                self.delegate?.audioSource(self, didFailWith: .deviceUnavailable)
            }
        }
    }

    private static func deviceExists(_ deviceID: AudioDeviceID) -> Bool {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var dataSize: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &dataSize) == noErr else {
            return false
        }
        let count = Int(dataSize) / MemoryLayout<AudioDeviceID>.size
        var deviceIDs = [AudioDeviceID](repeating: 0, count: count)
        guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &dataSize, &deviceIDs) == noErr else {
            return false
        }
        return deviceIDs.contains(deviceID)
    }
}

private extension UInt64 {
    /// Converts a Core Audio host time (mach absolute time units) to seconds,
    /// matching the clock domain `NDIAudioSource` must also stamp against.
    func hostTimeToSeconds() -> TimeInterval {
        var timebase = mach_timebase_info_data_t()
        mach_timebase_info(&timebase)
        let nanos = self * UInt64(timebase.numer) / UInt64(timebase.denom)
        return TimeInterval(nanos) / 1_000_000_000
    }
}
