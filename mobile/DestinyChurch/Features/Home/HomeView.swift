import SwiftUI

struct HomeView: View {
    var body: some View {
        NavigationStack {
            ComingSoonView(
                title: "Destiny Church",
                systemImage: "house.fill",
                note: "Live status, next service, featured event, latest sermon and episode — all from /api/app/v1/home."
            )
            .navigationTitle("Home")
        }
    }
}

#Preview {
    HomeView().tint(Brand.accent)
}
