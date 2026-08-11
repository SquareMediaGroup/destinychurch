import SwiftUI

/// The app's five tabs.
///
/// Five is Apple's practical cap and matches the four content pillars plus a
/// More tab (scope doc Appendix B.1).
///
/// Live is deliberately *not* a tab: the stream runs about two and a half hours
/// a week, and a tab that is dead 98% of the time is bad design. It surfaces
/// instead as a hero card on Home while live, a badge on Sermons, and a row in
/// More — all three pushing the same destination.
struct RootTabView: View {
    enum Tab: Hashable {
        case home, sermons, events, give, more
    }

    @State private var selection: Tab = .home

    var body: some View {
        TabView(selection: $selection) {
            Tab("Home", systemImage: "house.fill", value: Tab.home) {
                HomeView()
            }
            Tab("Sermons", systemImage: "play.rectangle.on.rectangle.fill", value: Tab.sermons) {
                SermonsView()
            }
            Tab("Events", systemImage: "calendar", value: Tab.events) {
                EventsListView()
            }
            Tab("Give", systemImage: "heart.fill", value: Tab.give) {
                GiveView()
            }
            Tab("More", systemImage: "ellipsis.circle", value: Tab.more) {
                MoreView()
            }
        }
    }
}

#Preview {
    RootTabView().tint(Brand.accent)
}
