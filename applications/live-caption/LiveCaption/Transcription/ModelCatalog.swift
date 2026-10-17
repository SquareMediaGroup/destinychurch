import Foundation

/// One whisper.cpp model file available on this machine.
struct WhisperModel: Identifiable, Hashable {
    let url: URL
    var id: String { url.path }
    var name: String { url.deletingPathExtension().lastPathComponent }

    var fileSizeDescription: String {
        let size = (try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0
        return ByteCountFormatter.string(fromByteCount: Int64(size), countStyle: .file)
    }
}

/// Finds installed `ggml-*.bin` models. Models are multi-GB and licensed
/// separately, so they're never bundled in the app or committed — they're
/// fetched per machine by `Scripts/fetch-whisper-model.sh`, which is why this
/// looks them up at runtime instead of resolving a build-time path.
enum ModelCatalog {
    /// Where a model dropped in by a non-developer operator should live.
    static var applicationSupportDirectory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("Live Caption/Models", isDirectory: true)
    }

    /// Searched in order: the user's Application Support directory, then the
    /// checkout's `Vendor/Models` (where `fetch-whisper-model.sh` puts them,
    /// so a developer running from Xcode doesn't have to copy files around).
    static func availableModels() -> [WhisperModel] {
        var seenPaths = Set<String>()
        var models: [WhisperModel] = []

        for directory in searchDirectories() {
            let contents = (try? FileManager.default.contentsOfDirectory(
                at: directory,
                includingPropertiesForKeys: [.fileSizeKey],
                options: [.skipsHiddenFiles]
            )) ?? []

            for url in contents where url.pathExtension == "bin" {
                guard seenPaths.insert(url.path).inserted else { continue }
                models.append(WhisperModel(url: url))
            }
        }

        return models.sorted { $0.name < $1.name }
    }

    private static func searchDirectories() -> [URL] {
        var directories = [applicationSupportDirectory]
        if let vendorModels = vendorModelsDirectory() {
            directories.append(vendorModels)
        }
        return directories
    }

    /// Walks up from the app binary to find a `Vendor/Models` alongside the
    /// checkout. Only ever resolves during development — in an installed copy
    /// there's no such directory above the .app and this returns nil.
    private static func vendorModelsDirectory() -> URL? {
        var directory = Bundle.main.bundleURL
        for _ in 0..<8 {
            directory = directory.deletingLastPathComponent()
            let candidate = directory.appendingPathComponent("Vendor/Models", isDirectory: true)
            if FileManager.default.fileExists(atPath: candidate.path) {
                return candidate
            }
        }
        return nil
    }
}
