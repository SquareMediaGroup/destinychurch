import Testing
@testable import LiveCaption

struct TranscriptCleanerTests {
    private func texts(_ tokens: [RawToken]) -> [String] {
        TranscriptCleaner.removingAnnotations(TranscriptCleaner.words(from: tokens)).map(\.text)
    }

    @Test func joinsWordPiecesAndPunctuation() {
        let tokens = [
            RawToken(" Turn", startTime: 0.0),
            RawToken(" to", startTime: 0.3),
            RawToken(" De", startTime: 0.5),
            RawToken("uter", startTime: 0.6),
            RawToken("onomy", startTime: 0.7),
            RawToken(",", startTime: 0.9),
        ]
        #expect(texts(tokens) == ["Turn", "to", "Deuteronomy,"])
    }

    @Test func wordTakesFirstTokenTimeAndLowestConfidence() {
        let words = TranscriptCleaner.words(from: [
            RawToken(" Mal", startTime: 1.0, confidence: 0.9),
            RawToken("achi", startTime: 1.2, confidence: 0.4),
        ])
        #expect(words.count == 1)
        #expect(words.first?.startTime == 1.0)
        #expect(words.first?.confidence == 0.4)
    }

    @Test func rejoinsMultiByteCharacterSplitAcrossTokens() {
        let note = Array("♪".utf8)
        let tokens = [
            RawToken(bytes: [UInt8(ascii: " ")] + note.prefix(2), startTime: 0, confidence: 1),
            RawToken(bytes: Array(note.dropFirst(2)), startTime: 0.1, confidence: 1),
        ]
        #expect(TranscriptCleaner.words(from: tokens).map(\.text) == ["♪"])
    }

    @Test func dropsApplauseAndMusicLabels() {
        let tokens = [
            RawToken(" Amen", startTime: 0),
            RawToken(".", startTime: 0.2),
            RawToken(" [", startTime: 1),
            RawToken("App", startTime: 1.1),
            RawToken("lause", startTime: 1.2),
            RawToken("]", startTime: 1.3),
            RawToken(" ♪", startTime: 2),
            RawToken(" (", startTime: 3),
            RawToken("audience", startTime: 3.1),
            RawToken(" laughing", startTime: 3.2),
            RawToken(")", startTime: 3.3),
            RawToken(" Praise", startTime: 4),
        ]
        #expect(texts(tokens) == ["Amen.", "Praise"])
    }

    @Test func keepsSpokenPartOfWordWithLabelAttached() {
        let words: [TranscriptCleaner.Word] = [(text: "God.[Applause]", startTime: 0, confidence: 1)]
        #expect(TranscriptCleaner.removingAnnotations(words).map(\.text) == ["God."])
    }

    @Test func flagsStockSubtitleOutrosOnly() {
        #expect(TranscriptCleaner.isKnownHallucination("Thanks for watching!"))
        #expect(TranscriptCleaner.isKnownHallucination("Subtitles by the Amara.org community"))
        #expect(!TranscriptCleaner.isKnownHallucination("Thank you."))
        #expect(!TranscriptCleaner.isKnownHallucination("Thank you, Lord, for your grace."))
        #expect(!TranscriptCleaner.isKnownHallucination(""))
    }

    @Test func speechRangeToleranceIsInclusive() {
        let ranges: [ClosedRange<Double>] = [2.0...4.0]
        #expect(TranscriptCleaner.isWithinSpeech(3.0, ranges: ranges, tolerance: 0.5))
        #expect(TranscriptCleaner.isWithinSpeech(1.6, ranges: ranges, tolerance: 0.5))
        #expect(!TranscriptCleaner.isWithinSpeech(5.0, ranges: ranges, tolerance: 0.5))
        #expect(!TranscriptCleaner.isWithinSpeech(1.0, ranges: [], tolerance: 0.5))
    }
}
