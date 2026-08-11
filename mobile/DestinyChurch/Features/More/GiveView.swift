import SwiftUI

/// Giving.
///
/// The screen's content is ChurchSuite's own hosted donate flow in a WebView,
/// under a native nav bar. That is deliberate on two counts: ChurchSuite keeps
/// PCI scope and Gift Aid handling, and App Review expects an external payment
/// flow to look plainly like one rather than a native-looking form (scope doc
/// §6 and Appendix B.2).
struct GiveView: View {
    var body: some View {
        NavigationStack {
            ComingSoonView(
                title: "Give",
                systemImage: "heart.fill",
                note: "ChurchSuite's hosted donate page, in a WebView under native chrome."
            )
            .navigationTitle("Give")
        }
    }
}

#Preview {
    GiveView().tint(Brand.accent)
}
