import SwiftUI

struct SermonsView: View {
    /// Watch and Listen load independently, so a YouTube quota trip cannot
    /// take the podcast down with it.
    enum Mode: String, CaseIterable, Identifiable {
        case watch = "Watch"
        case listen = "Listen"
        var id: Self { self }
    }

    @State private var mode: Mode = .watch

    var body: some View {
        NavigationStack {
            Group {
                switch mode {
                case .watch:
                    ComingSoonView(
                        title: "Watch",
                        systemImage: "play.rectangle.fill",
                        note: "Sermon videos from /api/app/v1/sermons."
                    )
                case .listen:
                    ComingSoonView(
                        title: "Listen",
                        systemImage: "waveform",
                        note: "The DCTV podcast, with background audio and lock-screen controls."
                    )
                }
            }
            .navigationTitle("Sermons")
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Picker("View", selection: $mode) {
                        ForEach(Mode.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
            }
        }
    }
}

#Preview {
    SermonsView().tint(Brand.accent)
}
