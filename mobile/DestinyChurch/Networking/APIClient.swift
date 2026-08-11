import Foundation

/// Endpoints on the app BFF. Adding a case here is the only place a path
/// string should ever appear.
enum Endpoint: Sendable {
    case config
    case home
    case events
    case event(slug: String)
    case sermons
    case podcast
    case live

    var path: String {
        switch self {
        case .config: "/api/app/v1/config"
        case .home: "/api/app/v1/home"
        case .events: "/api/app/v1/events"
        case .event(let slug): "/api/app/v1/events/\(slug)"
        case .sermons: "/api/app/v1/sermons"
        case .podcast: "/api/app/v1/podcast"
        case .live: "/api/app/v1/live"
        }
    }
}

/// The one way the app talks to the network.
///
/// Deliberately small: the BFF has already done the normalising, so there is
/// nothing to do here but fetch, decode, and translate errors.
final class APIClient: Sendable {
    static let shared = APIClient()

    private let session: URLSession
    private let baseURL: URL?

    init(baseURL: URL? = APIClient.configuredBaseURL) {
        self.baseURL = baseURL

        let configuration = URLSessionConfiguration.default
        configuration.urlCache = URLCache(
            memoryCapacity: 16 * 1024 * 1024,
            diskCapacity: 128 * 1024 * 1024
        )
        // Rather than failing instantly in a tunnel, hold the request until
        // connectivity returns or the timeout expires.
        configuration.waitsForConnectivity = true
        configuration.timeoutIntervalForRequest = 15
        // Lets app traffic be told apart from web traffic in analytics.
        configuration.httpAdditionalHeaders = [
            "User-Agent": APIClient.userAgent
        ]
        self.session = URLSession(configuration: configuration)
    }

    /// Debug builds point at `npm run dev`, Release at production — both come
    /// from `DC_API_BASE` in project.yml via Info.plist. The environment
    /// variable override exists so the simulator can be aimed elsewhere
    /// without a rebuild.
    static var configuredBaseURL: URL? {
        if let override = ProcessInfo.processInfo.environment["DC_API_BASE"],
           let url = URL(string: override) {
            return url
        }
        let value = Bundle.main.object(forInfoDictionaryKey: "DCAPIBase") as? String
        return value.flatMap(URL.init(string:))
    }

    private static var userAgent: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "0"
        return "DestinyChurch-iOS/\(version) (\(build))"
    }

    func get<T: Decodable & Sendable>(
        _ endpoint: Endpoint,
        as type: T.Type = T.self
    ) async throws(APIError) -> Envelope<T> {
        guard let baseURL,
              let url = URL(string: endpoint.path, relativeTo: baseURL)
        else {
            throw APIError.invalidURL
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(from: url)
        } catch {
            throw APIError.from(error)
        }

        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw APIError.server(status: http.statusCode)
        }

        do {
            return try JSONDecoder.destiny.decode(Envelope<T>.self, from: data)
        } catch {
            throw APIError.decoding(String(describing: error))
        }
    }
}
