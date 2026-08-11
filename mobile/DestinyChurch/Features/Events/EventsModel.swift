import Foundation

/// Events, grouped by the month they next occur in.
struct EventMonthGroup: Identifiable, Sendable {
    let id: String
    let label: String
    let series: [EventSeries]
}

@MainActor
@Observable
final class EventsModel {
    private(set) var state: LoadState<[EventSeries]> = .idle

    private let client: APIClient

    init(client: APIClient = .shared) {
        self.client = client
    }

    /// Grouped for display. Kept as a computed property rather than stored
    /// state so there is only ever one source of truth to keep in sync.
    var groups: [EventMonthGroup] {
        guard let series = state.value else { return [] }
        var order: [String] = []
        var buckets: [String: [EventSeries]] = [:]

        for event in series {
            let key = Self.monthKey(event)
            if buckets[key] == nil {
                order.append(key)
                buckets[key] = []
            }
            buckets[key]?.append(event)
        }

        return order.map { key in
            EventMonthGroup(
                id: key,
                label: Self.monthLabel(buckets[key]?.first),
                series: buckets[key] ?? []
            )
        }
    }

    func load() async {
        // Don't flash a spinner over content we already have — a pull to
        // refresh should leave the list in place.
        if state.value == nil { state = .loading }
        do {
            let envelope = try await client.get(.events, as: EventsResponse.self)
            state = LoadState.from(envelope).map(\.series)
        } catch {
            state = .failed(error)
        }
    }

    private static func monthKey(_ event: EventSeries) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = event.churchTimeZone
        let parts = calendar.dateComponents([.year, .month], from: event.next.startsAt)
        return "\(parts.year ?? 0)-\(String(format: "%02d", parts.month ?? 0))"
    }

    private static func monthLabel(_ event: EventSeries?) -> String {
        guard let event else { return "" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_GB")
        formatter.timeZone = event.churchTimeZone
        formatter.setLocalizedDateFormatFromTemplate("MMMM yyyy")
        return formatter.string(from: event.next.startsAt)
    }
}

extension LoadState {
    /// Project a loaded envelope's payload onto one of its fields, preserving
    /// whichever case we are in — so a degraded response keeps its notice.
    func map<T: Sendable>(_ transform: (Value) -> T) -> LoadState<T> {
        switch self {
        case .idle: .idle
        case .loading: .loading
        case .loaded(let value): .loaded(transform(value))
        case .degraded(let value, let notice): .degraded(value.map(transform), notice: notice)
        case .failed(let error): .failed(error)
        }
    }
}
