import Foundation

/// What a screen is currently showing.
///
/// `degraded` is the case that justifies having this type at all: the BFF can
/// answer successfully while telling us an upstream is down, and the right UI
/// is *both* — render whatever data survived, and say plainly that it may be
/// incomplete. A plain `Result` cannot express that.
enum LoadState<Value: Sendable>: Sendable {
    case idle
    case loading
    case loaded(Value)
    case degraded(Value?, notice: String)
    case failed(APIError)

    /// The data to render, if there is any, whichever case we are in.
    var value: Value? {
        switch self {
        case .loaded(let value): value
        case .degraded(let value, _): value
        case .idle, .loading, .failed: nil
        }
    }

    /// The banner copy, if the server sent one.
    var notice: String? {
        if case .degraded(_, let notice) = self { return notice }
        return nil
    }

    var isLoading: Bool {
        if case .loading = self { return true }
        return false
    }

}

// `Envelope` needs its payload to be Decodable, but a LoadState in general
// does not — screens hold mapped, non-decodable values too (see `map`).
// Constraining the extension rather than the whole enum keeps both true.
extension LoadState where Value: Decodable {
    /// Build the right case from a decoded envelope, so no screen has to
    /// remember the status/notice mapping.
    static func from(_ envelope: Envelope<Value>) -> LoadState {
        switch envelope.status {
        case .ok:
            .loaded(envelope.data)
        case .degraded:
            .degraded(
                envelope.data,
                notice: envelope.notice ?? "Some content is temporarily unavailable."
            )
        }
    }
}
