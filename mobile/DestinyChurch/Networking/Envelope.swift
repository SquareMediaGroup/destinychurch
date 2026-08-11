import Foundation

/// The wrapper every `/api/app/v1/*` endpoint returns.
///
/// The `status`/`notice` pair is the contract that lets the app tell "the
/// calendar is empty" apart from "we couldn't reach ChurchSuite" — a
/// distinction the raw upstream feeds do not make. `notice` is server-authored
/// copy shown verbatim, so the wording can change without an App Store release.
struct Envelope<T: Decodable & Sendable>: Decodable, Sendable {
    enum Status: String, Decodable, Sendable {
        case ok
        case degraded
    }

    let status: Status
    let generatedAt: Date
    let data: T
    let notice: String?
}

extension JSONDecoder {
    /// The decoder for every BFF response.
    ///
    /// No key strategy: the BFF emits camelCase deliberately so Swift models
    /// map one-to-one and a rename is visible in the diff on both sides.
    static let destiny: JSONDecoder = {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let raw = try decoder.singleValueContainer().decode(String.self)
            guard let date = Date.rfc3339(raw) else {
                throw DecodingError.dataCorrupted(
                    .init(
                        codingPath: decoder.codingPath,
                        debugDescription: "Not an RFC3339 date: \(raw)"
                    )
                )
            }
            return date
        }
        return decoder
    }()
}

extension Date {
    /// Parse RFC3339 with or without fractional seconds.
    ///
    /// Both shapes really do arrive: `generatedAt` comes from JavaScript's
    /// `toISOString()` and carries milliseconds, while event timestamps are
    /// built by the BFF and do not. A single style would reject one of them.
    ///
    /// `ISO8601FormatStyle` rather than `ISO8601DateFormatter` because the
    /// latter is a non-Sendable class, so sharing one across a concurrent
    /// decode is a data race under Swift 6. This is a value type — no lock,
    /// no `nonisolated(unsafe)`, and it parses the `+01:00` offsets the BFF
    /// attaches to event times.
    static func rfc3339(_ string: String) -> Date? {
        if let date = try? fractionalStyle.parse(string) { return date }
        return try? plainStyle.parse(string)
    }

    private static let fractionalStyle = Date.ISO8601FormatStyle(
        includingFractionalSeconds: true
    )
    private static let plainStyle = Date.ISO8601FormatStyle(
        includingFractionalSeconds: false
    )
}
