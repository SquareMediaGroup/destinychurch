import SwiftUI

struct EventsListView: View {
    @State private var model = EventsModel()

    var body: some View {
        NavigationStack {
            StateContainer(
                state: model.state,
                isEmpty: \.isEmpty,
                retry: { await model.load() }
            ) { _ in
                list
            } empty: {
                ContentUnavailableView(
                    "Nothing on the calendar",
                    systemImage: "calendar",
                    description: Text("Check back soon — new events are added regularly.")
                )
            }
            .navigationTitle("What's On")
            .navigationDestination(for: EventSeries.self) { event in
                EventDetailView(event: event)
            }
            .refreshable { await model.load() }
            .task {
                // `.task` re-runs on every appearance; only fetch once.
                if case .idle = model.state { await model.load() }
            }
        }
    }

    private var list: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 24, pinnedViews: [.sectionHeaders]) {
                ForEach(model.groups) { group in
                    Section {
                        ForEach(group.series) { event in
                            NavigationLink(value: event) {
                                EventCard(event: event)
                            }
                            .buttonStyle(.plain)
                        }
                    } header: {
                        Text(group.label)
                            .font(.title3.weight(.bold))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 8)
                            .background(.background)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
    }
}

#Preview {
    EventsListView().tint(Brand.accent)
}
