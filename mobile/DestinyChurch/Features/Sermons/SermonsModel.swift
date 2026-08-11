import Foundation

/// Watch and Listen load independently on purpose: they have unrelated
/// upstreams (YouTube and Buzzsprout), and a YouTube quota trip should not
/// take the podcast down with it. Two `LoadState`s, never one.
@MainActor
@Observable
final class SermonsModel {
    private(set) var videos: LoadState<SermonsResponse> = .idle
    private(set) var podcast: LoadState<PodcastShow?> = .idle

    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    func loadVideos() async {
        if videos.value == nil { videos = .loading }
        do {
            videos = LoadState.from(try await client.get(.sermons, as: SermonsResponse.self))
        } catch {
            videos = .failed(error)
        }
    }

    func loadPodcast() async {
        if podcast.value == nil { podcast = .loading }
        do {
            let envelope = try await client.get(.podcast, as: PodcastResponse.self)
            podcast = LoadState.from(envelope).map(\.show)
        } catch {
            podcast = .failed(error)
        }
    }
}
