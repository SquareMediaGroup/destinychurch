import SwiftUI

/// Giving.
///
/// The screen is ChurchSuite's own hosted donate flow in a WebView under a
/// native nav bar. Deliberate on two counts: ChurchSuite keeps PCI scope and
/// Gift Aid handling entirely, and App Review expects an external payment flow
/// to present plainly as one rather than as a native-looking form (scope doc
/// §6 and Appendix B.2).
struct GiveView: View {
    // TODO: source this from /api/app/v1/config once AppConfigStore lands, so
    // the URL can change without an App Store release. The constant is the
    // same value the website embeds today.
    private let donateURL = URL(string: "https://destinytees.churchsuite.com/donate")!

    var body: some View {
        BrowserView(url: donateURL, title: "Give")
    }
}

#Preview {
    GiveView().tint(Brand.accent)
}
