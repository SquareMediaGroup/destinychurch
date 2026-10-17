import CoreAudio
import Foundation

/// One selectable audio source, presented uniformly whether it's a physical
/// Core Audio device or a source discovered on the network via NDI.
enum DiscoveredAudioSource: Identifiable, Hashable {
    case coreAudio(deviceID: AudioDeviceID, name: String)
    case ndi(sourceName: String, urlAddress: String)

    var id: String {
        switch self {
        case .coreAudio(let deviceID, _): "core-audio-\(deviceID)"
        case .ndi(let sourceName, _): "ndi-\(sourceName)"
        }
    }

    var displayName: String {
        switch self {
        case .coreAudio(_, let name): name
        case .ndi(let sourceName, _): sourceName
        }
    }
}

/// Enumerates both input paths so Settings (Phase 5) and the menu bar quick
/// control (Phase 2) can present one unified source picker.
enum AudioDeviceDiscovery {
    /// Lists Core Audio devices that have at least one input channel.
    static func coreAudioInputDevices() -> [DiscoveredAudioSource] {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioHardwarePropertyDevices,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )

        var dataSize: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &dataSize) == noErr else {
            return []
        }
        let deviceCount = Int(dataSize) / MemoryLayout<AudioDeviceID>.size
        var deviceIDs = [AudioDeviceID](repeating: 0, count: deviceCount)
        guard AudioObjectGetPropertyData(AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &dataSize, &deviceIDs) == noErr else {
            return []
        }

        return deviceIDs.compactMap { deviceID in
            guard hasInputChannels(deviceID), let name = deviceName(deviceID) else { return nil }
            return .coreAudio(deviceID: deviceID, name: name)
        }
    }

    private static func hasInputChannels(_ deviceID: AudioDeviceID) -> Bool {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioDevicePropertyStreamConfiguration,
            mScope: kAudioDevicePropertyScopeInput,
            mElement: kAudioObjectPropertyElementMain
        )
        var dataSize: UInt32 = 0
        guard AudioObjectGetPropertyDataSize(deviceID, &address, 0, nil, &dataSize) == noErr, dataSize > 0 else {
            return false
        }
        let bufferListPointer = UnsafeMutablePointer<AudioBufferList>.allocate(capacity: 1)
        defer { bufferListPointer.deallocate() }
        guard AudioObjectGetPropertyData(deviceID, &address, 0, nil, &dataSize, bufferListPointer) == noErr else {
            return false
        }
        let bufferList = UnsafeMutableAudioBufferListPointer(bufferListPointer)
        return bufferList.contains { $0.mNumberChannels > 0 }
    }

    private static func deviceName(_ deviceID: AudioDeviceID) -> String? {
        var address = AudioObjectPropertyAddress(
            mSelector: kAudioObjectPropertyName,
            mScope: kAudioObjectPropertyScopeGlobal,
            mElement: kAudioObjectPropertyElementMain
        )
        var name: CFString = "" as CFString
        var dataSize = UInt32(MemoryLayout<CFString>.size)
        let status = withUnsafeMutablePointer(to: &name) { pointer -> OSStatus in
            AudioObjectGetPropertyData(deviceID, &address, 0, nil, &dataSize, pointer)
        }
        guard status == noErr else { return nil }
        return name as String
    }

    // NDI source discovery lives in `NDIAudioSource` (wraps `NDIlib_find_*`)
    // since it needs the NDI SDK's find-instance lifecycle managed alongside
    // the receive connection, not a one-shot enumeration like Core Audio's.
}
