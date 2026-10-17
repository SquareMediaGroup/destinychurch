import Foundation
import Testing
@testable import LiveCaption

/// End-to-end checks against the real NDI SDK: a publisher started here must
/// actually become discoverable on the network, and must disappear when
/// stopped. These need no production NDI gear — NDI discovery finds sources on
/// the local machine — which is the point: the output path can be verified
/// away from the building.
struct NDIOutputPublisherTests {
    /// Goes through the app's own discovery rather than the SDK directly, so
    /// this covers the same code path that populates the source picker.
    /// Discovery is a network round trip; allow it several seconds before
    /// concluding a source genuinely isn't there.
    private func discoveredSourceNames(waitSeconds: UInt32 = 4) -> [String] {
        NDIAudioSource.discoverSources(waitSeconds: waitSeconds).map(\.displayName)
    }

    @Test func publisherBecomesDiscoverableAndStopsCleanly() async throws {
        // Unique per run so a leftover source from an earlier run can't make
        // this pass when it should fail.
        let sourceName = "Live Caption Test \(UUID().uuidString.prefix(8))"
        let publisher = NDIOutputPublisher(
            sourceName: sourceName,
            width: 640,
            height: 360,
            fontSize: 32
        )

        try publisher.start()
        publisher.update(text: "Amazing grace")

        // NDI advertises the source asynchronously after creation.
        try await Task.sleep(for: .seconds(2))

        let namesWhileRunning = discoveredSourceNames()
        let isDiscovered = namesWhileRunning.contains { $0.contains(sourceName) }

        publisher.stop()

        #expect(isDiscovered, "Published NDI source was not discoverable. Saw: \(namesWhileRunning)")
    }

    @Test func stopIsSafeWhileFramesAreStillBeingSent() throws {
        // The send thread touches the pixel buffers outside the lock while NDI
        // encodes; stopping mid-send used to be a use-after-free. Exercised
        // repeatedly because the race only bites when stop() lands inside a
        // send, which is timing-dependent.
        for _ in 0..<5 {
            let publisher = NDIOutputPublisher(
                sourceName: "Live Caption Churn \(UUID().uuidString.prefix(8))",
                width: 320,
                height: 180,
                fontSize: 24
            )
            try publisher.start()
            publisher.update(text: "how sweet the sound")
            publisher.stop()
        }
    }

    @Test func updatingAfterStopIsIgnoredRatherThanCrashing() throws {
        let publisher = NDIOutputPublisher(
            sourceName: "Live Caption Late \(UUID().uuidString.prefix(8))",
            width: 320,
            height: 180,
            fontSize: 24
        )

        try publisher.start()
        publisher.stop()
        // The render queue may still be draining work queued before the stop.
        publisher.update(text: "after the end")
    }
}
