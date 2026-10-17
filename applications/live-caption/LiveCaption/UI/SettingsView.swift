import SwiftUI

/// Everything that's configured once for a room and then left alone. Anything
/// touched during a live service belongs on the control panel instead.
struct SettingsView: View {
    @Bindable var preferences: Preferences

    var body: some View {
        TabView {
            AppearanceSettingsView(preferences: preferences)
                .tabItem { Text("Appearance") }
            TranscriptionSettingsView(preferences: preferences)
                .tabItem { Text("Transcription") }
            NDIOutputSettingsView(preferences: preferences)
                .tabItem { Text("NDI Output") }
            VocabularySettingsView(preferences: preferences)
                .tabItem { Text("Vocabulary") }
        }
        .frame(width: 480, height: 340)
    }
}

private struct AppearanceSettingsView: View {
    @Bindable var preferences: Preferences

    var body: some View {
        Form {
            LabeledContent("Caption size") {
                VStack(alignment: .leading) {
                    Slider(value: $preferences.captionFontSize, in: 24...120, step: 2)
                    Text("\(Int(preferences.captionFontSize)) pt")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            LabeledContent("Background") {
                VStack(alignment: .leading) {
                    Slider(value: $preferences.captionBackgroundOpacity, in: 0...1)
                    Text("\(Int(preferences.captionBackgroundOpacity * 100))% opaque behind the text")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            LabeledContent("Words on screen") {
                VStack(alignment: .leading) {
                    Stepper(value: $preferences.maxDisplayWords, in: 6...80, step: 2) {
                        Text("\(preferences.maxDisplayWords) words")
                    }
                    Text("How much of the transcript stays visible before it scrolls away.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .formStyle(.grouped)
    }
}

private struct TranscriptionSettingsView: View {
    @Bindable var preferences: Preferences

    var body: some View {
        Form {
            LabeledContent("Stability delay") {
                VStack(alignment: .leading) {
                    Slider(value: $preferences.stabilityDelay, in: 0...1.5, step: 0.05)
                    Text(String(format: "%.2f seconds", preferences.stabilityDelay))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text("How long a word must stay unchanged before it appears. Higher is steadier but lags the speaker further; lower shows words sooner but lets them visibly rewrite themselves.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            LabeledContent("Models") {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Models are looked up in Application Support > Live Caption > Models, and in the checkout's Vendor/Models during development.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    Button("Open Models Folder") {
                        let directory = ModelCatalog.applicationSupportDirectory
                        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
                        NSWorkspace.shared.open(directory)
                    }
                }
            }
        }
        .formStyle(.grouped)
    }
}

private struct NDIOutputSettingsView: View {
    @Bindable var preferences: Preferences
    @State private var selection: NDIOutputConfiguration.ID?

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Each output is its own NDI source, all carrying the same words. Size one for the switcher's lower third and another for a foyer display, and both go out at once.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            List(selection: $selection) {
                ForEach($preferences.ndiOutputs) { $output in
                    NDIOutputRow(output: $output, isDuplicateName: isDuplicateName(output))
                        .tag(output.id)
                }
                .onDelete { preferences.ndiOutputs.remove(atOffsets: $0) }
            }

            HStack {
                Button("Add Output") {
                    preferences.ndiOutputs.append(
                        NDIOutputConfiguration(name: uniqueName())
                    )
                }
                Button("Remove") {
                    preferences.ndiOutputs.removeAll { $0.id == selection }
                    selection = nil
                }
                .disabled(selection == nil || preferences.ndiOutputs.count <= 1)
                Spacer()
            }

            Text("Every output sends a transparent background so a switcher can key the captions over program video. Leave Groups empty for NDI's default group.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
    }

    /// NDI identifies sources by name on the network, so two outputs sharing
    /// one name collide and a receiver can't tell them apart.
    private func isDuplicateName(_ output: NDIOutputConfiguration) -> Bool {
        preferences.ndiOutputs.contains { $0.id != output.id && $0.name == output.name }
    }

    private func uniqueName() -> String {
        var index = preferences.ndiOutputs.count + 1
        var candidate = "Live Caption \(index)"
        while preferences.ndiOutputs.contains(where: { $0.name == candidate }) {
            index += 1
            candidate = "Live Caption \(index)"
        }
        return candidate
    }
}

private struct NDIOutputRow: View {
    @Binding var output: NDIOutputConfiguration
    let isDuplicateName: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Toggle("", isOn: $output.isEnabled)
                    .labelsHidden()
                TextField("Source name", text: $output.name)
            }

            if isDuplicateName {
                Text("Another output already uses this name. NDI identifies sources by name, so they will collide.")
                    .font(.caption)
                    .foregroundStyle(.orange)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 6) {
                TextField("Width", value: $output.width, format: .number)
                    .frame(width: 62)
                Text("x").foregroundStyle(.secondary)
                TextField("Height", value: $output.height, format: .number)
                    .frame(width: 62)
                Text("at").foregroundStyle(.secondary)
                TextField("Size", value: $output.fontSize, format: .number)
                    .frame(width: 46)
                Text("pt").foregroundStyle(.secondary)
            }
            .font(.callout)

            TextField("Groups (optional, comma separated)", text: $output.groups)
                .font(.callout)
        }
        .padding(.vertical, 4)
    }
}

private struct VocabularySettingsView: View {
    @Bindable var preferences: Preferences
    @State private var newTerm = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Names and terms to bias transcription toward. Speaker names, local place names, and anything the model keeps getting wrong. The 66 books of the Bible are already included.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            HStack {
                TextField("Add a term", text: $newTerm)
                    .onSubmit(addTerm)
                Button("Add", action: addTerm)
                    .disabled(newTerm.trimmingCharacters(in: .whitespaces).isEmpty)
            }

            List {
                ForEach(preferences.customVocabulary, id: \.self) { term in
                    HStack {
                        Text(term)
                        Spacer()
                        Button("Remove") {
                            preferences.customVocabulary.removeAll { $0 == term }
                        }
                        .buttonStyle(.link)
                    }
                }
            }
            .frame(maxHeight: .infinity)

            // whisper.cpp's prompt is a decoding bias, not a dictionary — past
            // a few dozen words it starts crowding out real audio context
            // rather than helping.
            if preferences.customVocabulary.count + VocabularyPrompt.defaultVocabulary.count > VocabularyPrompt.maxWordCount {
                Text("Only the first \(VocabularyPrompt.maxWordCount) words are sent to the model. Custom terms are sent first.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(16)
    }

    private func addTerm() {
        let trimmed = newTerm.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty, !preferences.customVocabulary.contains(trimmed) else { return }
        preferences.customVocabulary.append(trimmed)
        newTerm = ""
    }
}
