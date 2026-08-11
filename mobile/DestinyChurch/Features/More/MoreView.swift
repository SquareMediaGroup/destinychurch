import SwiftUI

/// Everything else — built entirely from `/api/app/v1/config`, so adding or
/// reordering a ChurchSuite form is a server-side JSON edit rather than an App
/// Store release.
struct MoreView: View {
    var body: some View {
        NavigationStack {
            ComingSoonView(
                title: "More",
                systemImage: "ellipsis.circle",
                note: "Forms, live, visit us and settings — driven by /api/app/v1/config."
            )
            .navigationTitle("More")
        }
    }
}

#Preview {
    MoreView().tint(Brand.accent)
}
