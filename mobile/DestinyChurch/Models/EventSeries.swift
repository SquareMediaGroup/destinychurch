import Foundation

/// One event, with every occurrence of it.
///
/// Mirrors `AppEventSeries` in `lib/appSerializers.ts`. Everything awkward
/// about the ChurchSuite feed — string-encoded booleans, an empty *array* where
/// artwork should be, HTML descriptions, naive timestamps — is already resolved
/// by the BFF, so this decodes straight across with no custom logic.
struct EventSeries: Decodable, Sendable, Identifiable, Hashable {
    struct Occurrence: Decodable, Sendable, Hashable, Identifiable {
        let identifier: String?
        let startsAt: Date
        let endsAt: Date
        let signupUrl: URL?

        var id: String { identifier ?? startsAt.description }
    }

    struct Location: Decodable, Sendable, Hashable {
        let name: String?
        let address: String?
        let latitude: Double?
        let longitude: Double?

        var hasCoordinates: Bool { latitude != nil && longitude != nil }
    }

    let slug: String
    let seriesKey: String
    let name: String
    let sessionCount: Int
    /// Plain text, emoji-stripped, clamped by the BFF — safe for a card.
    let summary: String
    /// Sanitised HTML for the detail screen. Empty when there is none.
    let descriptionHtml: String
    let imageUrl: URL?
    let thumbnailUrl: URL?
    let categoryName: String?
    let categoryColor: String?
    let location: Location?
    let signupUrl: URL?
    let webUrl: URL
    let icsUrl: URL
    /// Always "Europe/London" — the church's clock, not the phone's.
    let timeZone: String
    let isMultiday: Bool
    let next: Occurrence
    let occurrences: [Occurrence]

    var id: String { slug }

    /// Times are formatted in the church's timezone, so an 11am service reads
    /// as 11am to someone opening the app abroad.
    var churchTimeZone: TimeZone {
        TimeZone(identifier: timeZone) ?? .gmt
    }

    var isSeries: Bool { sessionCount > 1 }
}

/// The `/api/app/v1/events` payload.
struct EventsResponse: Decodable, Sendable {
    let series: [EventSeries]
}

/// The `/api/app/v1/events/{slug}` payload — used only on deep-link cold start.
struct EventResponse: Decodable, Sendable {
    let series: EventSeries?
}

// MARK: - Display formatting

extension EventSeries {
    /// "WED 5 AUG · 7:30 PM" — the kicker above an event's name.
    var kicker: String {
        let day = Self.dayFormatter(churchTimeZone).string(from: next.startsAt)
        let time = Self.timeFormatter(churchTimeZone).string(from: next.startsAt)
        return "\(day.uppercased()) · \(time)"
    }

    /// "5" / "AUG" for the date chip shown when an event has no artwork.
    var dateChip: (day: String, month: String) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = churchTimeZone
        let day = String(calendar.component(.day, from: next.startsAt))
        let month = Self.monthFormatter(churchTimeZone)
            .string(from: next.startsAt)
            .uppercased()
        return (day, month)
    }

    private static func dayFormatter(_ zone: TimeZone) -> DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.timeZone = zone
        formatter.setLocalizedDateFormatFromTemplate("EEE d MMM")
        return formatter
    }

    private static func timeFormatter(_ zone: TimeZone) -> DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.timeZone = zone
        formatter.setLocalizedDateFormatFromTemplate("j:mm")
        return formatter
    }

    private static func monthFormatter(_ zone: TimeZone) -> DateFormatter {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.timeZone = zone
        formatter.setLocalizedDateFormatFromTemplate("MMM")
        return formatter
    }
}
