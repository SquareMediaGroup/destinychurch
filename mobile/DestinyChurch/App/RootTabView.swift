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
    /// Named `AppTab`, not `Tab` — SwiftUI's own `Tab` is used below, and a
    /// nested type of the same name shadows it.
    enum AppTab: Hashable {
        case home, sermons, events, give, more
    }

    @State private var selection: AppTab = .home

    var body: some View {
        TabView(selection: $selection) {
            Tab("Home", systemImage: "house.fill", value: AppTab.home) {
                HomeView()
            }
            Tab("Sermons", systemImage: "play.rectangle.on.rectangle.fill", value: AppTab.sermons) {
                SermonsView()
            }
            Tab("Events", systemImage: "calendar", value: AppTab.events) {
                EventsListView()
            }
            Tab("Give", systemImage: "heart.fill", value: AppTab.give) {
                GiveView()
            }
            Tab("More", systemImage: "ellipsis.circle", value: AppTab.more) {
                MoreView()
            }
        }
    }
}

#Preview {
    RootTabView().tint(Brand.accent)
}
