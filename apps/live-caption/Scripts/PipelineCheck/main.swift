import AVFoundation
import Foundation

// End-to-end check of the real transcription pipeline: a recorded sermon is
// pushed through `StreamingTranscriber` + `WhisperEngine` (+ the Silero gate)
// exactly as live audio would be, then the captions are checked for decoding
// loops, duplicated words and accuracy against the script.
//
// It catches what unit tests can't — the repeating-text loop came from how
// consecutive windows fed each other, which only shows with a real model over
// a real stream. It's a command-line tool rather than an XCTest because it
// compiles the app's own transcription sources directly, so it runs headless
// (an app-hosted test hangs when the Mac's screen is locked).
//
// Run from apps/live-caption: `make pipeline-check` (see Makefile).

let checkoutRoot = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let arguments = CommandLine.arguments.dropFirst()
let audioURL = URL(fileURLWithPath: arguments.first ?? "Vendor/TestAudio/sermon.wav", relativeTo: checkoutRoot)
let scriptURL = URL(fileURLWithPath: arguments.dropFirst().first ?? "Scripts/TestAudio/sermon.txt", relativeTo: checkoutRoot)
let modelPath = checkoutRoot.appendingPathComponent("Vendor/Models/ggml-large-v3-turbo.bin").path
let vadPath = checkoutRoot.appendingPathComponent("Vendor/Models/ggml-silero-v5.1.2.bin").path
let reportDirectory = checkoutRoot.appendingPathComponent("Vendor/TestAudio")

// MARK: - Running the pipeline

struct RunResult {
    var transcript: String
    var shownCaptions: [String]
    var windowCount: Int
    var processingSeconds: Double
    var slowestWindowSeconds: Double
}

final class EventLog: @unchecked Sendable {
    private let lock = NSLock()
    private var events: [(TranscriptEvent, Date)] = []
    func append(_ event: TranscriptEvent) { lock.withLock { events.append((event, Date())) } }
    var snapshot: [(TranscriptEvent, Date)] { lock.withLock { events } }
}

final class NullSource: AudioSource {
    weak var delegate: (any AudioSourceDelegate)?
    var isRunning = true
    func start() throws {}
    func stop() {}
}

@MainActor
func runPipeline(samples: [Float], useSpeechDetector: Bool) async throws -> RunResult {
    let engine = try WhisperEngine(modelPath: modelPath)
    let detector = useSpeechDetector ? SpeechDetector(modelPath: vadPath) : nil
    if useSpeechDetector, detector == nil { throw NSError(domain: "PipelineCheck", code: 1, userInfo: [NSLocalizedDescriptionKey: "VAD model missing"]) }
    let log = EventLog()
    let prompt = pipelinePrompt()
    let transcriber = StreamingTranscriber(
        engine: engine,
        speechDetector: detector,
        vocabularyPrompt: { prompt },
        onEvent: { log.append($0) }
    )

    // Same 100ms frames a capture device delivers. Fed as fast as the
    // transcriber's queue accepts them; windows are still processed strictly
    // in order, which is all the pipeline's logic depends on.
    let source = NullSource()
    let frameLength = 1_600
    let started = Date()
    var offset = 0
    while offset < samples.count {
        let end = min(offset + frameLength, samples.count)
        transcriber.audioSource(source, didProduce: PCMFrame(
            samples: Array(samples[offset..<end]),
            hostTimestamp: 1_000 + Double(offset) / 16_000
        ))
        offset = end
    }

    // One `.partial` per window run: wait for every window to report.
    let duration = Double(samples.count) / 16_000
    let expectedWindows = duration >= 10 ? Int((duration - 10) / 3.5) + 1 : 0
    let deadline = Date().addingTimeInterval(900)
    while Date() < deadline {
        let partials = log.snapshot.filter { if case .partial = $0.0 { return true } else { return false } }.count
        if partials >= expectedWindows { break }
        try await Task.sleep(for: .milliseconds(200))
    }

    var windowTimes: [Date] = []
    var shown: [String] = []
    let stabilizer = CaptionStabilizer(stabilityDelay: 0)
    var lastPartial: [WordToken] = []
    let debug = ProcessInfo.processInfo.environment["PIPELINE_DEBUG"] != nil
    for (event, time) in log.snapshot {
        if debug {
            switch event {
            case .finalized(let segment):
                print("  FINAL  " + segment.words.map { "\($0.text)@\(String(format: "%.1f", $0.startTime - 1_000))" }.joined(separator: " "))
            case .partial(let hypothesis):
                print("  PEND#\(hypothesis.windowID) " + hypothesis.words.map { "\($0.text)@\(String(format: "%.1f", $0.startTime - 1_000))" }.joined(separator: " "))
            }
        }
        stabilizer.ingest(event)
        if case .partial(let hypothesis) = event {
            windowTimes.append(time)
            lastPartial = hypothesis.words
            let caption = stabilizer.displayWords(limit: 28).map(\.text).joined(separator: " ")
            if shown.last != caption { shown.append(caption) }
        }
    }
    // The stream ended mid-window: its last partial words never get a later
    // window to finalize them, but they were said.
    let words = stabilizer.finalizedWords + lastPartial
    let gaps = zip(windowTimes.dropFirst(), windowTimes).map { $0.timeIntervalSince($1) }

    return RunResult(
        transcript: words.map(\.text).joined(separator: " "),
        shownCaptions: shown,
        windowCount: windowTimes.count,
        processingSeconds: Date().timeIntervalSince(started),
        slowestWindowSeconds: gaps.max() ?? 0
    )
}

/// Whisper's own segments for one window, before any of the app's cleaning.
func dumpRawSegments(samples: [Float], start: Double) {
    let context = whisper_init_from_file_with_params(modelPath, whisper_context_default_params())!
    defer { whisper_free(context) }
    let prompt = pipelinePrompt()
    var params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY)
    params.no_context = true
    params.print_progress = false
    let variants = ProcessInfo.processInfo.environment["PIPELINE_RAW_PROMPT"] == "0" ? "" : prompt
    let from = Int(start * 16_000), to = min(from + 160_000, samples.count)
    let window = Array(samples[from..<to])
    variants.withCString { promptPointer in
        "en".withCString { language in
            params.language = language
            if !variants.isEmpty { params.initial_prompt = promptPointer }
            _ = window.withUnsafeBufferPointer { whisper_full(context, params, $0.baseAddress, Int32($0.count)) }
        }
    }
    for index in 0..<whisper_full_n_segments(context) {
        let t0 = Double(whisper_full_get_segment_t0(context, index)) / 100 + start
        let t1 = Double(whisper_full_get_segment_t1(context, index)) / 100 + start
        let noSpeech = whisper_full_get_segment_no_speech_prob(context, index)
        print(String(format: "%.1f-%.1f nsp=%.2f ", t0, t1, noSpeech) + String(cString: whisper_full_get_segment_text(context, index)))
    }
}

/// The app's prompt, or PIPELINE_PROMPT to try a different one.
func pipelinePrompt() -> String {
    ProcessInfo.processInfo.environment["PIPELINE_PROMPT"]
        ?? VocabularyPrompt.build(preamble: "", vocabulary: VocabularyPrompt.defaultVocabulary)
}

// MARK: - Fixtures

func loadSamples(_ url: URL) throws -> [Float] {
    let file = try AVAudioFile(forReading: url, commonFormat: .pcmFormatFloat32, interleaved: false)
    precondition(file.processingFormat.sampleRate == 16_000, "Test audio must be 16kHz")
    let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length))!
    try file.read(into: buffer)
    var samples = Array(UnsafeBufferPointer(start: buffer.floatChannelData![0], count: Int(buffer.frameLength)))

    // PIPELINE_NOISE_DB=15 mixes in room-ish noise (low-passed white noise)
    // at that signal-to-noise ratio, to approximate a live mic, not a studio.
    if let snr = ProcessInfo.processInfo.environment["PIPELINE_NOISE_DB"].flatMap(Double.init) {
        let speechPower = samples.reduce(0) { $0 + Double($1 * $1) } / Double(max(samples.count, 1))
        var generator = SystemRandomNumberGenerator()
        var smoothed: Float = 0
        var noise = samples.map { _ -> Float in
            smoothed = 0.85 * smoothed + 0.15 * Float.random(in: -1...1, using: &generator)
            return smoothed
        }
        let noisePower = noise.reduce(0) { $0 + Double($1 * $1) } / Double(max(noise.count, 1))
        let gain = Float(sqrt(speechPower / (noisePower * pow(10, snr / 10))))
        for index in noise.indices { noise[index] *= gain }
        samples = zip(samples, noise).map { $0 + $1 }
    }
    return samples
}

/// The script `say` read, minus its `[[slnc ...]]` pause commands.
func loadScript(_ url: URL) throws -> String {
    try String(contentsOf: url, encoding: .utf8)
        .replacingOccurrences(of: #"\[\[[^\]]*\]\]"#, with: " ", options: .regularExpression)
}

// MARK: - Scoring

func normalisedWords(_ text: String) -> [String] {
    text.lowercased()
        .replacingOccurrences(of: "-", with: " ")
        .components(separatedBy: CharacterSet.alphanumerics.union(.whitespaces).inverted).joined()
        .split(whereSeparator: \.isWhitespace).map(String.init)
}

/// Levenshtein distance over words, divided by the reference length.
func wordErrorRate(reference: [String], hypothesis: [String]) -> Double {
    guard !reference.isEmpty else { return hypothesis.isEmpty ? 0 : 1 }
    var previous = Array(0...hypothesis.count)
    for (i, referenceWord) in reference.enumerated() {
        var current = [i + 1] + Array(repeating: 0, count: hypothesis.count)
        for (j, hypothesisWord) in hypothesis.enumerated() {
            current[j + 1] = min(previous[j + 1] + 1, current[j] + 1, previous[j] + (referenceWord == hypothesisWord ? 0 : 1))
        }
        previous = current
    }
    return Double(previous[hypothesis.count]) / Double(reference.count)
}

/// Phrases (1–10 words) that appear `minimumRepeats`+ times back to back.
func repeatedRuns(in words: [String], minimumRepeats: Int) -> [String] {
    var found: [String] = []
    for length in 1...10 {
        var index = 0
        while index + length * minimumRepeats <= words.count {
            let phrase = words[index..<index + length]
            var repeats = 1
            while index + (repeats + 1) * length <= words.count,
                  words[index + repeats * length..<index + (repeats + 1) * length].elementsEqual(phrase) {
                repeats += 1
            }
            if repeats >= minimumRepeats {
                found.append("\"\(phrase.joined(separator: " "))\" x\(repeats)")
                index += repeats * length
            } else {
                index += 1
            }
        }
    }
    return found
}

// MARK: - Main

enum LiveCaptionPipelineCheck {
@MainActor
static func run() async -> Int32 {
    var failures: [String] = []
    do {
        let samples = try loadSamples(audioURL)

        // PIPELINE_WINDOWS=3.5,14 prints whisper's raw output for the 10s
        // windows starting at those times, then exits — for seeing exactly
        // what the model heard in one window.
        if let starts = ProcessInfo.processInfo.environment["PIPELINE_WINDOWS"] {
            let engine = try WhisperEngine(modelPath: modelPath)
            let prompt = pipelinePrompt()
            for start in starts.split(separator: ",").compactMap({ Double($0) }) {
                let from = Int(start * 16_000), to = min(from + 160_000, samples.count)
                let words = try engine.transcribe(samples: Array(samples[from..<to]), initialPrompt: prompt)
                print("[\(start)s] " + words.map { "\($0.text)@\(String(format: "%.1f", start + $0.startTime))" }.joined(separator: " "))
            }
            return 0
        }
        if let start = ProcessInfo.processInfo.environment["PIPELINE_RAW"].flatMap(Double.init) {
            dumpRawSegments(samples: samples, start: start)
            return 0
        }
        let expected = normalisedWords(try loadScript(scriptURL))
        try FileManager.default.createDirectory(at: reportDirectory, withIntermediateDirectories: true)

        for useVAD in [false, true] {
            let label = useVAD ? "with speech filter" : "no speech filter"
            print("🎧 Running \(audioURL.lastPathComponent) (\(label))...")
            let result = try await runPipeline(samples: samples, useSpeechDetector: useVAD)
            let produced = normalisedWords(result.transcript)
            let errorRate = wordErrorRate(reference: expected, hypothesis: produced)
            let loops = repeatedRuns(in: produced, minimumRepeats: 3)
            let loopedCaptions = result.shownCaptions.filter { !repeatedRuns(in: normalisedWords($0), minimumRepeats: 3).isEmpty }

            let summary = """
            Audio \(String(format: "%.0f", Double(samples.count) / 16_000))s, processed in \(String(format: "%.1f", result.processingSeconds))s, \
            \(result.windowCount) windows, slowest \(String(format: "%.2f", result.slowestWindowSeconds))s
            Words expected \(expected.count), produced \(produced.count), WER \(String(format: "%.1f", errorRate * 100))%
            Loops in transcript: \(loops.isEmpty ? "none" : loops.joined(separator: ", "))
            Captions shown with a loop: \(loopedCaptions.count)
            """
            print(summary)

            let reportURL = reportDirectory.appendingPathComponent("report-\(useVAD ? "vad" : "novad").txt")
            try """
            \(summary)

            --- Transcript ---
            \(result.transcript)

            --- Captions as shown, in order ---
            \(result.shownCaptions.joined(separator: "\n"))
            """.write(to: reportURL, atomically: true, encoding: .utf8)
            print("📝 \(reportURL.path)\n")

            if !loops.isEmpty { failures.append("\(label): transcript loops") }
            if !loopedCaptions.isEmpty { failures.append("\(label): a caption on screen looped") }
            if Double(produced.count) > Double(expected.count) * 1.15 { failures.append("\(label): duplicated words (\(produced.count) vs \(expected.count))") }
            if errorRate > 0.15 { failures.append("\(label): WER \(String(format: "%.1f", errorRate * 100))%") }
            // Each window must finish well inside the 3.5s stride, or a live
            // stream drifts further behind the speaker the longer it runs.
            if result.slowestWindowSeconds > 3.5 { failures.append("\(label): window took \(result.slowestWindowSeconds)s") }
        }
    } catch {
        print("❌ \(error.localizedDescription)")
        return 2
    }

    if failures.isEmpty {
        print("✅ Pipeline check passed")
        return 0
    }
    failures.forEach { print("❌ \($0)") }
    return 1
}
}

@main
enum PipelineCheck {
    static func main() async {
        exit(await LiveCaptionPipelineCheck.run())
    }
}
