import SwiftUI

@main
struct LiveCaptionApp: App {
    @State private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            Phase1DebugView(appState: appState)
        }
    }
}

/// Deliberately minimal Phase 1 UI: pick a source, start/stop, watch the
/// console for partial/finalized transcript lines. This is *not* the real
/// caption display or the Liquid Glass chrome described in the plan — those
/// land in Phase 2+, once Xcode 26 is installed on this machine (the real
/// `glassEffect()`/`GlassEffectContainer` APIs require the macOS 26 SDK,
/// which wasn't available when this was scaffolded). Kept as a plain,
/// unstyled view on purpose so Phase 1's only job — proving the audio ->
/// whisper.cpp pipeline works and hits the RTF/latency bar — isn't tangled
/// up with UI work that has its own separate prerequisite.
struct Phase1DebugView: View {
    let appState: AppState
    @State private var sources: [DiscoveredAudioSource] = []
    @State private var selectedSource: DiscoveredAudioSource?
    @State private var modelPath = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Live Caption — Phase 1 debug harness").font(.headline)

            Picker("Source", selection: $selectedSource) {
                Text("Select a source").tag(Optional<DiscoveredAudioSource>.none)
                ForEach(sources) { source in
                    Text(source.displayName).tag(Optional(source))
                }
            }

            TextField("Path to ggml model (.bin)", text: $modelPath)
                .textFieldStyle(.roundedBorder)

            HStack {
                Button(appState.isRunning ? "Stop" : "Start") {
                    if appState.isRunning {
                        appState.stop()
                    } else if let selectedSource {
                        appState.start(source: selectedSource, modelPath: modelPath)
                    }
                }
                .disabled(!appState.isRunning && (selectedSource == nil || modelPath.isEmpty))

                Button("Refresh sources", action: refreshSources)
            }

            Text(appState.statusMessage).foregroundStyle(.secondary)
            Text("Transcript is printed to the console — this view is intentionally not the real caption display.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(24)
        .frame(minWidth: 420, minHeight: 260)
        .onAppear(perform: refreshSources)
    }

    private func refreshSources() {
        sources = AudioDeviceDiscovery.coreAudioInputDevices() + NDIAudioSource.discoverSources()
    }
}
