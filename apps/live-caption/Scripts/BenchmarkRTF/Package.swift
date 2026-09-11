// swift-tools-version:5.10
// Standalone CLI harness for the Phase 1 exit criterion: measuring
// whisper.cpp's real-time factor (RTF) and end-to-end latency drift on the
// target Mac, against a pre-recorded WAV file, before any UI work begins.
//
// Requires `make whisper-build` to have been run first (../.. relative to
// this package), so `libwhisper`/`libggml*` and `whisper.h` exist to link
// against. Run from apps/live-caption/:
//
//   swift run --package-path Scripts/BenchmarkRTF benchmark-rtf \
//     path/to/sermon-sample.wav --model Vendor/Models/ggml-large-v3-turbo.bin

import PackageDescription

let whisperRoot = "../../Vendor/whisper.cpp"

let package = Package(
    name: "BenchmarkRTF",
    platforms: [.macOS(.v14)],
    targets: [
        .systemLibrary(name: "CWhisper", path: "Sources/CWhisper"),
        .executableTarget(
            name: "BenchmarkRTF",
            dependencies: ["CWhisper"],
            path: "Sources/BenchmarkRTF",
            cSettings: [
                .unsafeFlags(["-I\(whisperRoot)/include", "-I\(whisperRoot)/ggml/include"]),
            ],
            swiftSettings: [
                .unsafeFlags(["-Xcc", "-I\(whisperRoot)/include", "-Xcc", "-I\(whisperRoot)/ggml/include"]),
            ],
            linkerSettings: [
                .unsafeFlags([
                    "-L\(whisperRoot)/build/src",
                    "-L\(whisperRoot)/build/ggml/src",
                    "-lwhisper", "-lggml", "-lggml-base", "-lggml-cpu", "-lggml-metal",
                    "-framework", "Metal", "-framework", "Foundation",
                ]),
            ]
        ),
    ]
)
