import Foundation
import Testing
@testable import LiveCaption

@MainActor
struct CaptionStabilizerTests {
    private func word(_ text: String, at startTime: TimeInterval, seenAt: Date) -> WordToken {
        WordToken(text: text, startTime: startTime, confidence: nil, firstSeenAt: seenAt)
    }

    @Test func finalizedWordsAppearWithoutWaiting() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0.5)
        let now = Date()

        stabilizer.ingest(.finalized(FinalizedSegment(
            words: [word("amazing", at: 1.0, seenAt: now), word("grace", at: 1.4, seenAt: now)],
            segmentID: 1
        )))

        // Finalized words can never be revised, so the stability delay — which
        // exists only to absorb revisions — must not apply to them.
        #expect(stabilizer.displayWords(now: now).map(\.text) == ["amazing", "grace"])
    }

    @Test func partialWordsAreHeldBackUntilStable() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0.5)
        let seen = Date()

        stabilizer.ingest(.partial(PartialHypothesis(words: [word("how", at: 2.0, seenAt: seen)], windowID: 1)))

        #expect(stabilizer.displayWords(now: seen).isEmpty)
        #expect(stabilizer.displayWords(now: seen.addingTimeInterval(0.6)).map(\.text) == ["how"])
    }

    @Test func unchangedPartialWordsKeepTheirOriginalAge() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0.5)
        let firstWindow = Date()
        let secondWindow = firstWindow.addingTimeInterval(0.4)

        stabilizer.ingest(.partial(PartialHypothesis(words: [word("sweet", at: 3.0, seenAt: firstWindow)], windowID: 1)))
        // The next window re-proposes the same word with a fresh timestamp,
        // as StreamingTranscriber always does — its age must be carried
        // forward, or the delay would reset every window and never elapse.
        stabilizer.ingest(.partial(PartialHypothesis(words: [word("sweet", at: 3.0, seenAt: secondWindow)], windowID: 2)))

        #expect(stabilizer.displayWords(now: firstWindow.addingTimeInterval(0.6)).map(\.text) == ["sweet"])
    }

    @Test func revisedPartialWordRestartsItsDelay() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0.5)
        let firstWindow = Date()
        let secondWindow = firstWindow.addingTimeInterval(0.4)

        stabilizer.ingest(.partial(PartialHypothesis(words: [word("sound", at: 4.0, seenAt: firstWindow)], windowID: 1)))
        stabilizer.ingest(.partial(PartialHypothesis(words: [word("found", at: 4.0, seenAt: secondWindow)], windowID: 2)))

        // A different word at the same position is a revision, not the same
        // word ageing — it has to earn the delay on its own.
        #expect(stabilizer.displayWords(now: firstWindow.addingTimeInterval(0.6)).isEmpty)
        #expect(stabilizer.displayWords(now: secondWindow.addingTimeInterval(0.6)).map(\.text) == ["found"])
    }

    @Test func stopsAtTheFirstUnstableWord() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0.5)
        let old = Date()
        let recent = old.addingTimeInterval(0.45)

        stabilizer.ingest(.partial(PartialHypothesis(
            words: [word("that", at: 5.0, seenAt: old), word("saved", at: 5.3, seenAt: recent)],
            windowID: 1
        )))

        // Showing a later stable word while an earlier one is still unstable
        // would put a hole in the middle of the sentence.
        #expect(stabilizer.displayWords(now: old.addingTimeInterval(0.6)).map(\.text) == ["that"])
    }

    @Test func partialWordsAlreadyFinalizedAreNotShownTwice() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0)
        let now = Date()

        stabilizer.ingest(.partial(PartialHypothesis(words: [word("a", at: 6.0, seenAt: now)], windowID: 1)))
        stabilizer.ingest(.finalized(FinalizedSegment(words: [word("a", at: 6.0, seenAt: now)], segmentID: 1)))

        #expect(stabilizer.displayWords(now: now).map(\.text) == ["a"])
    }

    @Test func replayedFinalizedSegmentIsIgnored() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0)
        let now = Date()
        let segment = FinalizedSegment(words: [word("wretch", at: 7.0, seenAt: now)], segmentID: 1)

        stabilizer.ingest(.finalized(segment))
        stabilizer.ingest(.finalized(segment))

        #expect(stabilizer.displayWords(now: now).map(\.text) == ["wretch"])
    }

    @Test func limitKeepsTheMostRecentWords() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0)
        let now = Date()

        let words = (0..<10).map { word("w\($0)", at: Double($0), seenAt: now) }
        stabilizer.ingest(.finalized(FinalizedSegment(words: words, segmentID: 1)))

        // The tail is what's on screen — an operator reads the end of the
        // sentence, not the start of the service.
        #expect(stabilizer.displayWords(now: now, limit: 3).map(\.text) == ["w7", "w8", "w9"])
    }

    @Test func limitPrefersPartialsOverOlderFinalizedWords() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0)
        let now = Date()

        stabilizer.ingest(.finalized(FinalizedSegment(
            words: [word("old", at: 1.0, seenAt: now), word("older", at: 2.0, seenAt: now)],
            segmentID: 1
        )))
        stabilizer.ingest(.partial(PartialHypothesis(
            words: [word("new", at: 3.0, seenAt: now), word("newer", at: 4.0, seenAt: now)],
            windowID: 1
        )))

        #expect(stabilizer.displayWords(now: now, limit: 3).map(\.text) == ["older", "new", "newer"])
    }

    @Test func limitSmallerThanThePartialRunStillReturnsTheNewestWords() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0)
        let now = Date()

        stabilizer.ingest(.finalized(FinalizedSegment(words: [word("old", at: 1.0, seenAt: now)], segmentID: 1)))
        stabilizer.ingest(.partial(PartialHypothesis(
            words: [word("a", at: 2.0, seenAt: now), word("b", at: 3.0, seenAt: now), word("c", at: 4.0, seenAt: now)],
            windowID: 1
        )))

        #expect(stabilizer.displayWords(now: now, limit: 2).map(\.text) == ["b", "c"])
    }

    @Test func resetClearsEverything() {
        let stabilizer = CaptionStabilizer(stabilityDelay: 0)
        let now = Date()

        stabilizer.ingest(.finalized(FinalizedSegment(words: [word("like", at: 8.0, seenAt: now)], segmentID: 1)))
        stabilizer.reset()

        #expect(stabilizer.displayWords(now: now).isEmpty)

        // Segment IDs restart from 1 after a reset, so the de-duplication
        // counter has to have been cleared too or the next run's first
        // segment would be silently dropped.
        stabilizer.ingest(.finalized(FinalizedSegment(words: [word("me", at: 1.0, seenAt: now)], segmentID: 1)))
        #expect(stabilizer.displayWords(now: now).map(\.text) == ["me"])
    }
}
