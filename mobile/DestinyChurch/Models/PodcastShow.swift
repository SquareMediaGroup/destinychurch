import Foundation

/// One podcast episode. Mirrors `AppPodcastEpisode` in `lib/appSerializers.ts`.
///
/// `audioUrl` is a direct MP3 on Buzzsprout's CDN, which serves byte ranges —
/// that is what makes seeking work in `AVPlayer`.
struct PodcastEpisode: Decodable, Sendable, Identifiable, Hashable {
    let id: String
    let title: String
    let speaker: String?
    let summary: String
    let audioUrl: URL
    let imageUrl: URL
    let publishedAt: Date
    let durationSeconds: Int

    /// "1h 5m" / "42 min" — matches `formatEpisodeDuration` on the website.
    var durationLabel: String {
        let minutes = durationSeconds / 60
        guard minutes >= 60 else { return "\(minutes) min" }
        return "\(minutes / 60)h \(minutes % 60)m"
    }
}

struct PodcastShow: Decodable, Sendable {
    let title: String
    let author: String
    let description: String
    let imageUrl: URL
    let episodes: [PodcastEpisode]
}

struct PodcastResponse: Decodable, Sendable {
    let show: PodcastShow?
}
