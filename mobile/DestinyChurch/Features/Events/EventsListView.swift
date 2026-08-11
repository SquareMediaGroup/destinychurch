import SwiftUI

struct EventsListView: View {
    var body: some View {
        NavigationStack {
            ComingSoonView(
                title: "What's On",
                systemImage: "calendar",
                note: "Events grouped by month from /api/app/v1/events, with sign-up and add-to-calendar."
            )
            .navigationTitle("Events")
        }
    }
}

#Preview {
    EventsListView().tint(Brand.accent)
}
