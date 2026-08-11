import SwiftUI

@main
struct DestinyChurchApp: App {
    /// Config outlives every screen — Give and More both read it, and it is
    /// fetched once per launch over a bundled fallback.
    @State private var configStore = AppConfigStore()

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environment(configStore)
                // One global tint means every button, link and control picks up
                // the brand accent without asking.
                .tint(Brand.accent)
        }
    }
}
