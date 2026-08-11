import Foundation

/// Why a request failed, in terms the UI can speak.
///
/// The distinction that earns its keep is `.offline`: "You're offline" is a
/// materially better message than "Something went wrong", and it tells the
/// user the fix is theirs.
enum APIError: Error, Sendable, Equatable {
    case offline
    case timedOut
    case server(status: Int)
    case decoding(String)
    case invalidURL

    /// Copy shown directly to the user. Kept short — the retry button carries
    /// the call to action.
    var userMessage: String {
        switch self {
        case .offline:
            "You're offline. Check your connection and try again."
        case .timedOut:
            "That took too long. Please try again."
        case .server:
            "Something went wrong at our end. Please try again shortly."
        case .decoding, .invalidURL:
            "Something went wrong. Please try again shortly."
        }
    }

    var systemImage: String {
        switch self {
        case .offline: "wifi.slash"
        case .timedOut: "clock.arrow.circlepath"
        default: "exclamationmark.triangle"
        }
    }

    /// Map URLSession's error zoo onto the two cases worth distinguishing.
    static func from(_ error: any Error) -> APIError {
        guard let urlError = error as? URLError else {
            return .decoding(error.localizedDescription)
        }
        return switch urlError.code {
        case .notConnectedToInternet, .networkConnectionLost,
             .dataNotAllowed, .cannotConnectToHost:
            .offline
        case .timedOut:
            .timedOut
        default:
            .server(status: -1)
        }
    }
}
