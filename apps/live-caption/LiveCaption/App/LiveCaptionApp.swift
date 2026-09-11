import SwiftUI

@main
struct LiveCaptionApp: App {
    @State private var appState = AppState()
    @State private var windowManager = CaptionWindowManager()

    var body: some Scene {
        WindowGroup("Live Caption") {
            ControlPanelView(appState: appState, windowManager: windowManager)
        }
        .commands {
            // The stock About panel can't show the license text these
            // libraries require, so it's replaced with a real window.
            CommandGroup(replacing: .appInfo) {
                Button("About Live Caption") {
                    openAboutWindow()
                }
            }
            CommandGroup(after: .toolbar) {
                Button(windowManager.isShowing ? "Hide Caption Display" : "Show Caption Display") {
                    toggleCaptionDisplay()
                }
                .keyboardShortcut("d", modifiers: [.command, .shift])
            }
        }

        Settings {
            SettingsView(preferences: appState.preferences)
        }

        // A menu bar item so the pipeline can be started, stopped, and
        // watched without the control window being frontmost — during a
        // service the operator is usually in ProPresenter, not here.
        MenuBarExtra("Live Caption", systemImage: appState.isRunning ? "waveform.circle.fill" : "waveform.circle") {
            Text(appState.statusMessage)

            Divider()

            Button(appState.isRunning ? "Stop Captioning" : "Start Captioning") {
                if appState.isRunning {
                    appState.stop()
                } else if let source = appState.availableSources.first {
                    appState.start(source: source)
                }
            }
            .disabled(!appState.isRunning && appState.availableSources.isEmpty)

            Button(windowManager.isShowing ? "Hide Caption Display" : "Show Caption Display") {
                toggleCaptionDisplay()
            }

            Divider()

            Button("Quit Live Caption") {
                appState.stop()
                windowManager.hide()
                NSApplication.shared.terminate(nil)
            }
        }
    }

    private func toggleCaptionDisplay() {
        if windowManager.isShowing {
            windowManager.hide()
            return
        }
        let targets = CaptionDisplayTarget.available()
        // Prefer a secondary display — captioning onto the operator's own
        // screen is almost never what's wanted.
        guard let target = targets.count > 1 ? targets[1] : targets.first else { return }
        windowManager.show(
            store: appState.captionStore,
            preferences: appState.preferences,
            on: target
        )
    }

    private func openAboutWindow() {
        let controller = NSHostingController(rootView: AboutView())
        let window = NSWindow(contentViewController: controller)
        window.title = "About Live Caption"
        window.styleMask = [.titled, .closable]
        window.center()
        window.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate(ignoringOtherApps: true)
    }
}
