import SwiftUI

struct SermonsView: View {
    enum Mode: String, CaseIterable, Identifiable {
        case watch = "Watch"
        case listen = "Listen"
        var id: Self { self }
    }

    @State private var model = SermonsModel()
    @State private var mode: Mode = .watch
    @Environment(\.openURL) private var openURL

    var body: some View {
        NavigationStack {
            Group {
                switch mode {
                case .watch: watch
                case .listen: listen
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
            .task {
                if case .idle = model.videos { await model.loadVideos() }
            }
            .task(id: mode) {
                // The podcast is only fetched once the user asks for it.
                if mode == .listen, case .idle = model.podcast {
                    await model.loadPodcast()
                }
            }
        }
    }

    private var watch: some View {
        StateContainer(
            state: model.videos,
            isEmpty: { $0.videos.isEmpty },
            retry: { await model.loadVideos() }
        ) { response in
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(response.videos) { sermon in
                        Button {
                            // Until the in-app player lands, hand off to the
                            // YouTube app — a working route beats a dead tap.
                            openURL(sermon.youtubeUrl)
                        } label: {
                            VideoCard(sermon: sermon)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(16)
            }
            .refreshable { await model.loadVideos() }
        } empty: {
            ContentUnavailableView(
                "No sermons yet",
                systemImage: "play.rectangle",
                description: Text("New messages are posted after each Sunday gathering.")
            )
        }
    }

    private var listen: some View {
        StateContainer(
            state: model.podcast,
            isEmpty: { ($0?.episodes.isEmpty ?? true) },
            retry: { await model.loadPodcast() }
        ) { show in
            List {
                if let show {
                    Section {
                        ForEach(show.episodes) { episode in
                            EpisodeRow(episode: episode)
                        }
                    } header: {
                        Text(show.title)
                    } footer: {
                        Text("\(show.episodes.count) episodes")
                    }
                }
            }
            .listStyle(.plain)
            .refreshable { await model.loadPodcast() }
        } empty: {
            ContentUnavailableView(
                "No episodes yet",
                systemImage: "waveform",
                description: Text("The DCTV podcast will appear here.")
            )
        }
    }
}

#Preview {
    SermonsView().tint(Brand.accent)
}
