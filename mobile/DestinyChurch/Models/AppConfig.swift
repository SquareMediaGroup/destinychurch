import Foundation

/// Remote configuration. Mirrors `/api/app/v1/config`.
///
/// The point of this endpoint is that the More tab, the giving link and the
/// service times are *data*, not code — a changed ChurchSuite form slug is a
/// server-side edit rather than an App Store release.
struct AppConfig: Decodable, Sendable {
    struct Form: Decodable, Sendable, Identifiable, Hashable {
        let id: String
        let title: String
        let subtitle: String
        let url: URL
        /// An SF Symbol name, chosen server-side so adding a row needs no
        /// client change.
        let systemImage: String
    }

    struct ServiceTime: Decodable, Sendable, Hashable {
        let label: String
        let day: String
        /// Church-local wall clock, paired with `AppConfig.timeZone`.
        let start: String
        let end: String
    }

    struct Venue: Decodable, Sendable, Hashable {
        let name: String
        let address: String
        let latitude: Double
        let longitude: Double
    }

    struct Links: Decodable, Sendable, Hashable {
        let website: URL
        let youtube: URL
        let churchSuite: URL
        let privacy: URL
        let safeguarding: URL
    }

    let minSupportedBuild: Int
    let forceUpdateMessage: String?
    let givingUrl: URL
    let forms: [Form]
    let serviceTimes: [ServiceTime]
    let timeZone: String
    let venue: Venue
    let links: Links
}

/// Holds the config for the app's lifetime.
///
/// Ships with a bundled fallback so a cold launch on a bad network still
/// renders the More tab and the giving link rather than an empty screen.
@MainActor
@Observable
final class AppConfigStore {
    private(set) var config: AppConfig?
    private(set) var isLoaded = false

    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
        self.config = Self.bundledFallback()
    }

    func load() async {
        do {
            let envelope = try await client.get(.config, as: AppConfig.self)
            // A degraded config still carries usable data; only replace what we
            // have if the server actually sent forms.
            if !envelope.data.forms.isEmpty { config = envelope.data }
            isLoaded = true
        } catch {
            // Keep the fallback. A missing config is not worth an error screen
            // when every value has a sane default already on disk.
            isLoaded = true
        }
    }

    private static func bundledFallback() -> AppConfig? {
        guard let url = Bundle.main.url(forResource: "config-fallback", withExtension: "json"),
              let data = try? Data(contentsOf: url)
        else { return nil }
        return try? JSONDecoder.destiny.decode(AppConfig.self, from: data)
    }
}
