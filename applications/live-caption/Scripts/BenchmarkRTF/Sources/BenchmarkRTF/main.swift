import AVFoundation
import CWhisper
import Foundation

// Phase 1 exit-criterion harness (see ../../README.md): measures whisper.cpp's
// real-time factor and end-to-end latency drift against a pre-recorded WAV
// file, on the actual target Mac, for both large-v3-turbo and medium before
// any UI work begins. Deliberately bypasses live audio capture — it reads a
// file so the same fixed input can be re-run against either model for a fair
// comparison.

struct BenchmarkArguments {
    let wavPath: String
    let modelPath: String
    let windowLength: Double = 10.0
    let strideLength: Double = 3.5
}

func parseArguments() -> BenchmarkArguments {
    var args = CommandLine.arguments.dropFirst()
    guard let wavPath = args.first else {
        FileHandle.standardError.write("Usage: benchmark-rtf <path.wav> --model <path/to/ggml-model.bin>\n".data(using: .utf8)!)
        exit(1)
    }
    args = args.dropFirst()

    var modelPath: String?
    while let flag = args.first {
        args = args.dropFirst()
        if flag == "--model", let value = args.first {
            modelPath = value
            args = args.dropFirst()
        }
    }
    guard let modelPath else {
        FileHandle.standardError.write("Missing required --model <path/to/ggml-model.bin>\n".data(using: .utf8)!)
        exit(1)
    }
    return BenchmarkArguments(wavPath: wavPath, modelPath: modelPath)
}

func loadMonoFloat16k(path: String) throws -> [Float] {
    let file = try AVAudioFile(forReading: URL(fileURLWithPath: path))
    let targetFormat = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: 16_000, channels: 1, interleaved: false)!

    guard let converter = AVAudioConverter(from: file.processingFormat, to: targetFormat) else {
        throw NSError(domain: "BenchmarkRTF", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not create converter — check the WAV's format."])
    }

    guard let inputBuffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length)) else {
        throw NSError(domain: "BenchmarkRTF", code: 2)
    }
    try file.read(into: inputBuffer)

    let ratio = targetFormat.sampleRate / file.processingFormat.sampleRate
    guard let outputBuffer = AVAudioPCMBuffer(pcmFormat: targetFormat, frameCapacity: AVAudioFrameCount(Double(inputBuffer.frameLength) * ratio) + 1024) else {
        throw NSError(domain: "BenchmarkRTF", code: 3)
    }

    var suppliedInput = false
    var conversionError: NSError?
    converter.convert(to: outputBuffer, error: &conversionError) { _, status in
        if suppliedInput { status.pointee = .noDataNow; return nil }
        suppliedInput = true
        status.pointee = .haveData
        return inputBuffer
    }
    if let conversionError { throw conversionError }

    let frameCount = Int(outputBuffer.frameLength)
    guard let channelData = outputBuffer.floatChannelData else { return [] }
    return Array(UnsafeBufferPointer(start: channelData[0], count: frameCount))
}

let args = parseArguments()
print("Loading \(args.wavPath) ...")
let samples = try loadMonoFloat16k(path: args.wavPath)
let totalDuration = Double(samples.count) / 16_000.0
print("Loaded \(String(format: "%.1f", totalDuration))s of audio.")

print("Loading model \(args.modelPath) ...")
var contextParams = whisper_context_default_params()
contextParams.use_gpu = true
guard let context = whisper_init_from_file_with_params(args.modelPath, contextParams) else {
    FileHandle.standardError.write("Failed to load model at \(args.modelPath)\n".data(using: .utf8)!)
    exit(1)
}
guard let state = whisper_init_state(context) else {
    FileHandle.standardError.write("Failed to init whisper state\n".data(using: .utf8)!)
    exit(1)
}

let windowSamples = Int(args.windowLength * 16_000)
let strideSamples = Int(args.strideLength * 16_000)

print("window,audio_seconds,process_seconds,rtf,elapsed_stream_seconds")
var offset = 0
var windowIndex = 0
let benchmarkStart = Date()

while offset + windowSamples <= samples.count {
    let window = Array(samples[offset..<(offset + windowSamples)])

    var params = whisper_full_default_params(WHISPER_SAMPLING_GREEDY)
    params.print_progress = false
    params.print_special = false
    params.print_realtime = false
    params.print_timestamps = false
    params.language = "en".withCString { strdup($0) }

    let t0 = Date()
    let result = window.withUnsafeBufferPointer { buffer in
        whisper_full_with_state(context, state, params, buffer.baseAddress, Int32(buffer.count))
    }
    let processSeconds = Date().timeIntervalSince(t0)
    params.language.map { free(UnsafeMutableRawPointer(mutating: $0)) }

    guard result == 0 else {
        FileHandle.standardError.write("Inference failed on window \(windowIndex)\n".data(using: .utf8)!)
        break
    }

    let rtf = processSeconds / args.windowLength
    let elapsedStream = Double(offset + windowSamples) / 16_000.0
    print("\(windowIndex),\(args.windowLength),\(String(format: "%.3f", processSeconds)),\(String(format: "%.3f", rtf)),\(String(format: "%.1f", elapsedStream))")

    offset += strideSamples
    windowIndex += 1
}

let wallClockElapsed = Date().timeIntervalSince(benchmarkStart)
print("\nDone. \(windowIndex) windows over \(String(format: "%.1f", totalDuration))s of audio in \(String(format: "%.1f", wallClockElapsed))s wall clock.")
print("Check the rtf column above for drift: compare early-window RTF against late-window RTF.")
print("Exit criterion (see README.md): sustained RTF <= 0.5-0.6 with no upward drift from minute 2 to minute 25.")

whisper_free_state(state)
whisper_free(context)
