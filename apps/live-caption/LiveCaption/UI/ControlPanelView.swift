import SwiftUI

/// The operator's window: pick an input and a model, go live, and watch what
/// the congregation is seeing. Everything needed during a service is on this
/// one screen — anything that's only set up once lives in Settings instead.
struct ControlPanelView: View {
    @Bindable var appState: AppState
    @Bindable var windowManager: CaptionWindowManager

    @State private var selectedSource: DiscoveredAudioSource?
    @State private var displayTargets: [CaptionDisplayTarget] = []
    @State private var selectedDisplayTargetID: String?

    var body: some View {
        VStack(spacing: 0) {
            if let alertMessage = appState.alertMessage {
                alertBanner(alertMessage)
            }

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    inputSection
                    Divider()
                    outputSection
                    Divider()
                    previewSection
                }
                .padding(20)
            }
        }
        .frame(minWidth: 560, minHeight: 620)
        .onAppear {
            appState.refreshSources()
            appState.refreshModels()
            refreshDisplayTargets()
        }
        .onChange(of: appState.availableSources) { _, sources in
            if selectedSource == nil || !sources.contains(where: { $0 == selectedSource }) {
                selectedSource = sources.first
            }
        }
    }

    // MARK: - Input

    private var inputSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Input")

            HStack {
                Picker("Source", selection: $selectedSource) {
                    Text("None").tag(Optional<DiscoveredAudioSource>.none)
                    ForEach(appState.availableSources) { source in
                        Text(source.displayName).tag(Optional(source))
                    }
                }
                .disabled(appState.isRunning)

                Button("Refresh") { appState.refreshSources() }
                    .disabled(appState.isRunning || appState.isDiscoveringSources)
            }

            if appState.isDiscoveringSources {
                Text("Looking for NDI sources on the network")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Picker("Model", selection: Binding(
                get: { appState.preferences.modelPath },
                set: { appState.preferences.modelPath = $0 }
            )) {
                Text("None").tag("")
                ForEach(appState.availableModels) { model in
                    Text("\(model.name) — \(model.fileSizeDescription)").tag(model.url.path)
                }
            }
            .disabled(appState.isRunning)

            if appState.availableModels.isEmpty {
                Text("No models found. Run Scripts/fetch-whisper-model.sh, or put a ggml .bin file in Application Support > Live Caption > Models.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            HStack(spacing: 12) {
                Button(appState.isRunning ? "Stop" : "Start Captioning") {
                    if appState.isRunning {
                        appState.stop()
                    } else if let selectedSource {
                        appState.start(source: selectedSource)
                    }
                }
                .keyboardShortcut(.return, modifiers: [.command])
                .disabled(!appState.isRunning && selectedSource == nil)

                statusIndicator
            }
            .padding(.top, 4)
        }
    }

    private var statusIndicator: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(appState.isRunning ? Color.green : Color.secondary.opacity(0.5))
                .frame(width: 8, height: 8)
            Text(appState.statusMessage)
                .font(.callout)
                .foregroundStyle(.secondary)
        }
    }

    // MARK: - Output

    private var outputSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            sectionTitle("Output")

            HStack {
                Picker("Display", selection: $selectedDisplayTargetID) {
                    Text("None").tag(Optional<String>.none)
                    ForEach(displayTargets) { target in
                        Text(target.name).tag(Optional(target.id))
                    }
                }

                Button(windowManager.isShowing ? "Hide" : "Show") {
                    if windowManager.isShowing {
                        windowManager.hide()
                    } else if let target = displayTargets.first(where: { $0.id == selectedDisplayTargetID }) {
                        windowManager.show(
                            store: appState.captionStore,
                            preferences: appState.preferences,
                            on: target
                        )
                    }
                }
                .disabled(!windowManager.isShowing && selectedDisplayTargetID == nil)

                Button("Refresh", action: refreshDisplayTargets)
            }

            Toggle("Publish as NDI sources", isOn: Binding(
                get: { appState.preferences.ndiOutputEnabled },
                set: { appState.setNDIOutputEnabled($0) }
            ))

            if appState.preferences.ndiOutputEnabled {
                ndiOutputStatus
            }
        }
    }

    private var ndiOutputStatus: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(appState.preferences.ndiOutputs.filter(\.isEnabled)) { output in
                HStack(spacing: 6) {
                    Circle()
                        .fill(appState.liveNDIOutputNames.contains(output.name) ? Color.green : Color.secondary.opacity(0.4))
                        .frame(width: 6, height: 6)
                    Text("\(output.name) — \(output.width)x\(output.height)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if !output.groups.trimmingCharacters(in: .whitespaces).isEmpty {
                        Text("group: \(output.groups)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            if appState.preferences.ndiOutputs.filter(\.isEnabled).isEmpty {
                Text("No outputs enabled. Add one in Settings > NDI Output.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else if !appState.isRunning {
                Text("Transparent background for keying. Goes live with the pipeline.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Preview

    private var previewSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                sectionTitle("Preview")
                Spacer()
                Button("Clear") { appState.captionStore.clear() }
                    .disabled(appState.captionStore.displayText.isEmpty)
            }

            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.black)

                CaptionDisplayView(
                    text: appState.captionStore.displayText,
                    // The preview is a fraction of the output's width, so the
                    // real point size would overflow it — scale to keep the
                    // relative look honest.
                    fontSize: appState.preferences.captionFontSize * 0.4,
                    backgroundOpacity: appState.preferences.captionBackgroundOpacity
                )

                if appState.captionStore.displayText.isEmpty {
                    Text(appState.isRunning ? "Listening" : "Not running")
                        .font(.callout)
                        .foregroundStyle(.white.opacity(0.4))
                }
            }
            .frame(height: 180)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
    }

    // MARK: - Pieces

    private func alertBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.orange)
            Text(message)
                .font(.callout)
                .fixedSize(horizontal: false, vertical: true)
            Spacer()
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.orange.opacity(0.12))
    }

    private func sectionTitle(_ text: String) -> some View {
        Text(text)
            .font(.headline)
    }

    private func refreshDisplayTargets() {
        displayTargets = CaptionDisplayTarget.available()
        if selectedDisplayTargetID == nil || !displayTargets.contains(where: { $0.id == selectedDisplayTargetID }) {
            // Default to a secondary display when there is one — captioning
            // onto the operator's own screen is almost never what's wanted.
            selectedDisplayTargetID = (displayTargets.count > 1 ? displayTargets[1] : displayTargets.first)?.id
        }
    }
}
