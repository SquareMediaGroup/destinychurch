import SwiftUI

@main
struct DestinyChurchApp: App {
    var body: some Scene {
        WindowGroup {
            RootTabView()
                // One global tint means every button, link and control picks up
                // the brand accent without asking.
                .tint(Brand.accent)
        }
    }
}
