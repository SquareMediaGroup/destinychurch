import Foundation

/// One whisper.cpp token, before it's joined into words. Kept as raw UTF-8
/// bytes because whisper's BPE tokens can split a multi-byte character (a
/// curly quote, a music note) across two tokens; decoding each token on its
/// own would turn those into replacement characters.
struct RawToken: Sendable, Equatable {
    let bytes: [UInt8]
    /// Seconds from the start of the inference window.
    let startTime: TimeInterval
    let confidence: Float

    init(bytes: [UInt8], startTime: TimeInterval, confidence: Float) {
        self.bytes = bytes
        self.startTime = startTime
        self.confidence = confidence
    }

    init(_ text: String, startTime: TimeInterval, confidence: Float = 1) {
        self.init(bytes: Array(text.utf8), startTime: startTime, confidence: confidence)
    }
}

/// Turns whisper.cpp's raw token stream into words fit for a caption, and
/// strips what isn't speech. Pure functions only, so all of it is unit
/// tested without a model.
///
/// Why each step exists:
/// - Whisper's tokens are sub-word pieces (" De", "uter", "onomy", ","), with
///   a leading space marking the start of a new word. Showing tokens as words
///   reads "De uter onomy ," on screen.
/// - Whisper was trained on subtitles that label non-speech, so for applause,
///   laughter or music it often writes "[Applause]", "(laughs)" or "♪". Those
///   labels are useful as a signal but must never reach the caption.
/// - On silence or noise it can also invent a stock subtitle outro ("Thanks
///   for watching") — a known Whisper hallucination, not something a speaker
///   said.
enum TranscriptCleaner {
    typealias Word = (text: String, startTime: TimeInterval, confidence: Float)

    /// Joins tokens into words: a token starting with a space begins a new
    /// word, anything else (a word piece, punctuation) attaches to the
    /// previous one. A word's time is its first token's; its confidence is
    /// its least confident token's.
    static func words(from tokens: [RawToken]) -> [Word] {
        var words: [(bytes: [UInt8], startTime: TimeInterval, confidence: Float)] = []

        for token in tokens where !token.bytes.isEmpty {
            let startsWord = token.bytes.first == UInt8(ascii: " ")
            if startsWord || words.isEmpty {
                words.append((Array(token.bytes.drop(while: { $0 == UInt8(ascii: " ") })), token.startTime, token.confidence))
            } else {
                words[words.count - 1].bytes += token.bytes
                words[words.count - 1].confidence = min(words[words.count - 1].confidence, token.confidence)
            }
        }

        return words.compactMap { word -> Word? in
            let text = String(decoding: word.bytes, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
            guard !text.isEmpty else { return nil }
            return (text: text, startTime: word.startTime, confidence: word.confidence)
        }
    }

    /// Drops non-speech labels: anything inside [...] or (...), even when it
    /// spans several words ("(audience laughing)"), and words made only of
    /// music symbols. A word with a label stuck to it ("Amen.[Applause]")
    /// keeps its spoken part.
    static func removingAnnotations(_ words: [Word]) -> [Word] {
        var kept: [Word] = []
        var depth = 0

        for word in words {
            var visible = ""
            for character in word.text {
                switch character {
                case "[", "(":
                    depth += 1
                case "]", ")":
                    depth = max(0, depth - 1)
                default:
                    if depth == 0 { visible.append(character) }
                }
            }

            let text = visible.trimmingCharacters(in: .whitespaces)
            let hasSpokenContent = text.unicodeScalars.contains {
                !nonSpeechScalars.contains($0) && !CharacterSet.punctuationCharacters.contains($0)
            }
            if hasSpokenContent {
                kept.append((text: text, startTime: word.startTime, confidence: word.confidence))
            }
        }
        return kept
    }

    private static let nonSpeechScalars: Set<Unicode.Scalar> = ["♪", "♫", "♬", "♩", "*", " "]

    /// Stock phrases Whisper invents on silence or noise, learned from the
    /// end credits of web-video subtitles. Matched against a whole segment,
    /// so a speaker who genuinely says "thank you" is never dropped.
    static func isKnownHallucination(_ segmentText: String) -> Bool {
        let normalised = segmentText
            .lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.union(.whitespaces).inverted)
            .joined()
            .split(separator: " ")
            .joined(separator: " ")
        guard !normalised.isEmpty else { return false }
        return hallucinationPhrases.contains { normalised.contains($0) }
    }

    private static let hallucinationPhrases = [
        "thanks for watching",
        "thank you for watching",
        "thank you so much for watching",
        "please subscribe",
        "like and subscribe",
        "subtitles by",
        "subtitled by",
        "amaraorg",
        "transcribed by",
        "captions by",
    ]

    /// Keeps only times that fall in, or within `tolerance` of, a range the
    /// voice activity detector marked as speech. Whisper's token times are
    /// approximate (often a few hundred ms out), hence the tolerance.
    static func isWithinSpeech(_ time: TimeInterval, ranges: [ClosedRange<TimeInterval>], tolerance: TimeInterval) -> Bool {
        ranges.contains { range in
            time >= range.lowerBound - tolerance && time <= range.upperBound + tolerance
        }
    }
}
