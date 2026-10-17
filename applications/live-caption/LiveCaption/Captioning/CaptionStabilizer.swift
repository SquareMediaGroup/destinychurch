import Foundation

/// Decides which transcript words are steady enough to actually put on screen.
///
/// `StreamingTranscriber` emits two kinds of words: `.finalized` ones, which
/// are structurally guaranteed never to change again, and `.partial` ones,
/// which the next overlapping window may rewrite entirely. Showing partials
/// raw means captions visibly churn — words appear, change, and disappear
/// mid-sentence, which reads as broken to a congregation even when the final
/// text is correct.
///
/// The fix is a stability delay: a partial word must survive unchanged across
/// consecutive windows for `stabilityDelay` before it's allowed on screen.
/// `WordToken.firstSeenAt` is what makes that measurable — this type carries
/// it forward across windows for words that didn't change, so the clock starts
/// when a word was *first proposed*, not when the latest window re-proposed it.
@MainActor
final class CaptionStabilizer {
    /// How long a still-revisable word must survive unchanged before display.
    /// Trades latency for steadiness: 0 shows whisper.cpp's raw churn, ~1s
    /// is rock-steady but visibly lags the speaker.
    var stabilityDelay: TimeInterval

    /// Every word that can never change again, in stream order.
    private(set) var finalizedWords: [WordToken] = []

    private var partialWords: [WordToken] = []
    private var lastFinalizedSegmentID = 0
    /// Stream time up to which words have been finalized. Partial words at or
    /// before this are already represented in `finalizedWords` and must be
    /// dropped, or they'd render twice.
    private var finalizedHorizon: TimeInterval = -.infinity

    init(stabilityDelay: TimeInterval = 0.4) {
        self.stabilityDelay = stabilityDelay
    }

    func ingest(_ event: TranscriptEvent) {
        switch event {
        case .finalized(let segment):
            // Segment IDs increase monotonically; anything at or below what
            // we've already taken is a duplicate delivery, not new text.
            guard segment.segmentID > lastFinalizedSegmentID else { return }
            lastFinalizedSegmentID = segment.segmentID
            finalizedWords.append(contentsOf: segment.words)

            if let lastStartTime = segment.words.last?.startTime {
                finalizedHorizon = max(finalizedHorizon, lastStartTime)
            }
            partialWords.removeAll { $0.startTime <= finalizedHorizon }

        case .partial(let hypothesis):
            let fresh = hypothesis.words.filter { $0.startTime > finalizedHorizon }
            partialWords = carryForwardFirstSeen(fresh, from: partialWords)
        }
    }

    /// Words safe to display right now: everything finalized, plus the longest
    /// leading run of partial words that have outlived `stabilityDelay`.
    ///
    /// Deliberately a prefix rather than a filter — words are time-ordered, so
    /// a later word being stable while an earlier one isn't would punch a hole
    /// in the middle of a sentence. Stopping at the first unstable word keeps
    /// the caption a contiguous, readable phrase.
    ///
    /// `limit` keeps this O(limit) rather than O(whole transcript). It matters:
    /// this is called on a display tick several times a second, and
    /// `finalizedWords` grows for the entire service — by the end of a 90
    /// minute one it holds five figures of words, which is exactly the kind of
    /// steadily-worsening per-frame cost the latency-drift risk is about.
    func displayWords(now: Date = Date(), limit: Int? = nil) -> [WordToken] {
        let stablePartials = partialWords.prefix { word in
            now.timeIntervalSince(word.firstSeenAt) >= stabilityDelay
        }

        guard let limit else { return finalizedWords + stablePartials }
        guard stablePartials.count < limit else { return Array(stablePartials.suffix(limit)) }
        return finalizedWords.suffix(limit - stablePartials.count) + stablePartials
    }

    func reset() {
        finalizedWords.removeAll()
        partialWords.removeAll()
        lastFinalizedSegmentID = 0
        finalizedHorizon = -.infinity
    }

    /// Preserves the original `firstSeenAt` for words the new window proposed
    /// identically (`WordToken`'s `==` is text + start time). Without this
    /// every window would reset each word's age and nothing would ever clear
    /// the stability delay.
    private func carryForwardFirstSeen(_ incoming: [WordToken], from previous: [WordToken]) -> [WordToken] {
        incoming.map { word in
            guard let existing = previous.first(where: { $0 == word }) else { return word }
            return WordToken(
                text: word.text,
                startTime: word.startTime,
                confidence: word.confidence,
                firstSeenAt: existing.firstSeenAt
            )
        }
    }
}
