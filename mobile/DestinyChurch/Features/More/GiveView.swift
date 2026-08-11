import SwiftUI

/// Giving.
///
/// The screen is ChurchSuite's own hosted donate flow in a WebView under a
/// native nav bar. Deliberate on two counts: ChurchSuite keeps PCI scope and
/// Gift Aid handling entirely, and App Review expects an external payment flow
/// to present plainly as one rather than as a native-looking form (scope doc
/// §6 and Appendix B.2).
struct GiveView: View {
    @Environment(AppConfigStore.self) private var configStore

    var body: some View {
        if let url = configStore.config?.givingUrl {
            BrowserView(url: url, title: "Give")
        } else {
            // Only reachable if the bundled fallback config failed to decode,
            // which would be a build problem rather than a runtime one.
            ContentUnavailableView(
                "Giving is unavailable",
                systemImage: "heart.slash",
                description: Text("Please try again shortly.")
            )
        }
    }
}

#Preview {
    GiveView()
        .environment(AppConfigStore())
        .tint(Brand.accent)
}
