import Foundation
import Observation
import SwiftUI

/// User-facing settings, persisted to `UserDefaults`. Deliberately flat and
/// small — everything here is something an operator might reasonably need to
/// change between services, not internal tuning knobs.
@MainActor
@Observable
final class Preferences {
    var modelPath: String {
        didSet { defaults.set(modelPath, forKey: Key.modelPath) }
    }

    var captionFontSize: Double {
        didSet { defaults.set(captionFontSize, forKey: Key.captionFontSize) }
    }

    /// Opacity of the caption's backing plate on the full-screen display.
    /// Ignored by the NDI output, which always sends a transparent background
    /// so the downstream switcher can key it over program video.
    var captionBackgroundOpacity: Double {
        didSet { defaults.set(captionBackgroundOpacity, forKey: Key.captionBackgroundOpacity) }
    }

    var maxDisplayWords: Int {
        didSet { defaults.set(maxDisplayWords, forKey: Key.maxDisplayWords) }
    }

    /// See `CaptionStabilizer.stabilityDelay` — trades caption latency for
    /// steadiness.
    var stabilityDelay: Double {
        didSet { defaults.set(stabilityDelay, forKey: Key.stabilityDelay) }
    }

    /// Master switch. Individual outputs also have their own `isEnabled`, so
    /// one can be parked without losing its settings.
    var ndiOutputEnabled: Bool {
        didSet { defaults.set(ndiOutputEnabled, forKey: Key.ndiOutputEnabled) }
    }

    var ndiOutputs: [NDIOutputConfiguration] {
        didSet { persistNDIOutputs() }
    }

    /// Extra terms biasing whisper.cpp's decoding, on top of the built-in
    /// Bible-book list. Speaker and place names belong here.
    var customVocabulary: [String] {
        didSet { defaults.set(customVocabulary, forKey: Key.customVocabulary) }
    }

    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults

        self.modelPath = defaults.string(forKey: Key.modelPath) ?? ""
        self.captionFontSize = defaults.object(forKey: Key.captionFontSize) as? Double ?? 48
        self.captionBackgroundOpacity = defaults.object(forKey: Key.captionBackgroundOpacity) as? Double ?? 0.55
        self.maxDisplayWords = defaults.object(forKey: Key.maxDisplayWords) as? Int ?? 28
        self.stabilityDelay = defaults.object(forKey: Key.stabilityDelay) as? Double ?? 0.4
        self.ndiOutputEnabled = defaults.object(forKey: Key.ndiOutputEnabled) as? Bool ?? false
        self.customVocabulary = defaults.stringArray(forKey: Key.customVocabulary) ?? []

        if let data = defaults.data(forKey: Key.ndiOutputs),
           let decoded = try? JSONDecoder().decode([NDIOutputConfiguration].self, from: data),
           !decoded.isEmpty {
            self.ndiOutputs = decoded
        } else {
            self.ndiOutputs = [.defaultOutput]
        }
    }

    var effectiveVocabulary: [String] {
        customVocabulary + VocabularyPrompt.defaultVocabulary
    }

    var activeNDIOutputs: [NDIOutputConfiguration] {
        guard ndiOutputEnabled else { return [] }
        return ndiOutputs.filter(\.isEnabled)
    }

    private func persistNDIOutputs() {
        guard let data = try? JSONEncoder().encode(ndiOutputs) else { return }
        defaults.set(data, forKey: Key.ndiOutputs)
    }

    private enum Key {
        static let modelPath = "modelPath"
        static let captionFontSize = "captionFontSize"
        static let captionBackgroundOpacity = "captionBackgroundOpacity"
        static let maxDisplayWords = "maxDisplayWords"
        static let stabilityDelay = "stabilityDelay"
        static let ndiOutputEnabled = "ndiOutputEnabled"
        static let ndiOutputs = "ndiOutputs"
        static let customVocabulary = "customVocabulary"
    }
}
