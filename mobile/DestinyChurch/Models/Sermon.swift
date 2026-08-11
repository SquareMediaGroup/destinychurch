import Foundation

/// A sermon video. Mirrors `AppSermon` in `lib/appSerializers.ts`.
///
/// `durationSeconds` and `viewCount` arrive as numbers because the BFF already
/// parsed YouTube's ISO-8601 duration and string view count — the client should
/// never see `"PT1H2M3S"`.
struct Sermon: Decodable, Sendable, Identifiable, Hashable {
    let id: String
    let title: String
    let description: String
    let thumbnailUrl: URL
    let publishedAt: Date
    let durationSeconds: Int?
    let viewCount: Int?
    let youtubeUrl: URL

    /// "1:02:03" or "42:15".
    var durationLabel: String? {
        guard let total = durationSeconds, total > 0 else { return nil }
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let seconds = total % 60
        return hours > 0
            ? String(format: "%d:%02d:%02d", hours, minutes, seconds)
            : String(format: "%d:%02d", minutes, seconds)
    }

    /// "1.2K views".
    var viewsLabel: String? {
        guard let count = viewCount else { return nil }
        return "\(count.formatted(.number.notation(.compactName))) views"
    }
}

struct SermonsResponse: Decodable, Sendable {
    let videos: [Sermon]
    let channelUrl: URL
}
