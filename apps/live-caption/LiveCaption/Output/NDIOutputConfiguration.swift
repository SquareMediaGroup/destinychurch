import Foundation

/// One NDI source the captions are published on. Several can run at once —
/// a lower-third sized for the broadcast switcher and a full-screen version
/// for a foyer display have different sizes and type sizes, but carry the
/// same words.
struct NDIOutputConfiguration: Identifiable, Codable, Hashable {
    var id: UUID
    var name: String
    var isEnabled: Bool
    var width: Int
    var height: Int
    var fontSize: Double
    /// Comma-separated NDI groups to publish into. Empty means the default
    /// group, which is what receivers see unless they've been configured
    /// otherwise in NDI Access Manager.
    var groups: String

    init(
        id: UUID = UUID(),
        name: String,
        isEnabled: Bool = true,
        width: Int = 1920,
        height: Int = 1080,
        fontSize: Double = 48,
        groups: String = ""
    ) {
        self.id = id
        self.name = name
        self.isEnabled = isEnabled
        self.width = width
        self.height = height
        self.fontSize = fontSize
        self.groups = groups
    }

    static var defaultOutput: NDIOutputConfiguration {
        NDIOutputConfiguration(name: "Live Caption")
    }
}
