import SwiftUI

/// Placeholder for a screen that has its navigation shell but not yet its
/// content. Exists so the tab skeleton compiles and can be screenshotted at
/// Checkpoint 2, before the networking layer lands. Delete each usage as the
/// real screen arrives — and delete this file when the last one goes.
struct ComingSoonView: View {
    let title: String
    let systemImage: String
    let note: String

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: systemImage)
        } description: {
            Text(note)
        }
    }
}

#Preview {
    ComingSoonView(
        title: "Events",
        systemImage: "calendar",
        note: "Wired up to the app BFF next."
    )
}
