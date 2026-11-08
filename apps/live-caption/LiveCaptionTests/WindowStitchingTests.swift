import Testing
@testable import LiveCaption

/// `StreamingTranscriber.newContentStart`: where a new, overlapping window's
/// text picks up after what's already been finalized.
struct WindowStitchingTests {
    private func words(_ spec: String) -> [WordToken] {
        // "word@time word@time ..."
        spec.split(separator: " ").map { item in
            let parts = item.split(separator: "@")
            return WordToken(text: String(parts[0]), startTime: Double(parts[1])!, confidence: 1)
        }
    }

    private func newText(_ window: String, after tail: String) -> String {
        let windowWords = words(window)
        let start = StreamingTranscriber.newContentStart(in: windowWords, afterFinalized: words(tail))
        return windowWords[start...].map(\.text).joined(separator: " ")
    }

    @Test func skipsWordsAlreadyFinalizedEvenWhenTheirTimesDrift() {
        // The overlap is re-heard 0.4s later than first time: a time cutoff
        // would show "a lot" twice.
        let result = newText(
            "came@22.9 in@23.0 this@23.2 morning@23.4 carrying@23.8 a@24.0 lot.@24.2 Maybe@24.7 it@24.9",
            after: "this@22.8 morning@23.0 carrying@23.4 a@23.6 lot,@23.8"
        )
        #expect(result == "Maybe it")
    }

    @Test func keepsWordsReheardEarlierThanTheCutoff() {
        // Times drifted earlier: a time cutoff at 23.8 would drop "Maybe".
        let result = newText(
            "carrying@23.0 a@23.2 lot.@23.4 Maybe@23.7 it@24.0 was@24.2",
            after: "carrying@23.4 a@23.6 lot.@23.8"
        )
        #expect(result == "Maybe it was")
    }

    @Test func ignoresAMatchFarFromWhereTheTailWasHeard() {
        // "the night" also appears later in the window; it's not the seam.
        let result = newText(
            "through@77.5 the@78.0 night@78.2 so@78.5 that@78.8 all@79.5 through@80.0 the@80.2 night@80.4",
            after: "through@77.5 the@78.0 night,@78.2"
        )
        #expect(result == "so that all through the night")
    }

    @Test func fallsBackToTimeWhenTheTailIsntInTheWindow() {
        // After a long pause the finalized tail has slid out of the window.
        let result = newText("In@86.6 the@86.8 book@87.0 of@87.2 Isaiah@87.4", after: "can@80.0 sleep.@80.3")
        #expect(result == "In the book of Isaiah")
    }

    @Test func recoversASentenceThePreviousWindowSkipped() {
        // The previous window finalized "online." then skipped a sentence;
        // this window heard it, so it must be kept even though it's older
        // than how far the previous window got.
        let result = newText(
            "If@7.1 you@7.2 have@7.4 your@7.6 Bible@7.9 chapter@10.8 4.@11.1",
            after: "watching@6.2 online.@6.7"
        )
        #expect(result == "If you have your Bible chapter 4.")
    }

    @Test func firstWindowKeepsEverything() {
        #expect(newText("Good@0.1 morning@0.4", after: "") == "Good morning")
    }
}
