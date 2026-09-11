import AppKit
import Observation
import SwiftUI

/// One display the caption output can be sent to.
struct CaptionDisplayTarget: Identifiable, Hashable {
    let id: String
    let name: String

    /// `NSScreen` instances are recreated when the display configuration
    /// changes, so they can't be held onto — the stable display ID is what
    /// gets stored, and the screen is looked up again at use.
    var screen: NSScreen? {
        NSScreen.screens.first { CaptionDisplayTarget.identifier(for: $0) == id }
    }

    static func identifier(for screen: NSScreen) -> String {
        let number = screen.deviceDescription[NSDeviceDescriptionKey("NSScreenNumber")] as? NSNumber
        return number?.stringValue ?? screen.localizedName
    }

    static func available() -> [CaptionDisplayTarget] {
        NSScreen.screens.map { screen in
            CaptionDisplayTarget(id: identifier(for: screen), name: screen.localizedName)
        }
    }
}

/// Owns the borderless full-screen caption window shown on a connected
/// display. This is deliberately AppKit rather than a SwiftUI `Window` scene:
/// it has to cover the menu bar, sit above everything else, target a specific
/// screen, and never take focus away from the operator's control window —
/// none of which a plain SwiftUI scene gives reliably.
@MainActor
@Observable
final class CaptionWindowManager {
    private(set) var isShowing = false
    private(set) var activeTargetID: String?

    private var window: NSWindow?
    private var screenObserver: (any NSObjectProtocol)?

    func show(store: CaptionStore, preferences: Preferences, on target: CaptionDisplayTarget) {
        hide()

        guard let screen = target.screen else { return }

        let hostingController = NSHostingController(
            rootView: CaptionOutputView(store: store, preferences: preferences)
        )

        let window = NSWindow(contentViewController: hostingController)
        window.styleMask = [.borderless]
        window.setFrame(screen.frame, display: true)
        window.backgroundColor = .black
        window.isOpaque = true
        window.hasShadow = false
        // Above the menu bar and other apps' full-screen windows, so a
        // notification banner or a stray Dock reveal can't land on top of the
        // captions mid-service.
        window.level = .screenSaver
        window.collectionBehavior = [.canJoinAllSpaces, .stationary, .fullScreenNone]
        // Never steal focus: the operator stays in the control window.
        window.ignoresMouseEvents = true
        window.orderFrontRegardless()

        self.window = window
        self.activeTargetID = target.id
        self.isShowing = true

        observeScreenChanges(store: store, preferences: preferences, target: target)
    }

    func hide() {
        if let screenObserver {
            NotificationCenter.default.removeObserver(screenObserver)
            self.screenObserver = nil
        }
        window?.orderOut(nil)
        window?.close()
        window = nil
        activeTargetID = nil
        isShowing = false
    }

    /// Displays get unplugged mid-service. Follow the target if it comes back
    /// at a new frame, and close cleanly if it's gone rather than leaving an
    /// orphaned window on the operator's own screen.
    private func observeScreenChanges(store: CaptionStore, preferences: Preferences, target: CaptionDisplayTarget) {
        screenObserver = NotificationCenter.default.addObserver(
            forName: NSApplication.didChangeScreenParametersNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self, self.isShowing else { return }
                guard let screen = target.screen else {
                    self.hide()
                    return
                }
                self.window?.setFrame(screen.frame, display: true)
            }
        }
    }
}

private struct CaptionOutputView: View {
    let store: CaptionStore
    let preferences: Preferences

    var body: some View {
        CaptionDisplayView(
            text: store.displayText,
            fontSize: preferences.captionFontSize,
            backgroundOpacity: preferences.captionBackgroundOpacity,
            isFullScreen: true
        )
    }
}
