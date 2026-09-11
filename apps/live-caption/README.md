# Live Caption

A macOS app that captures live audio (Core Audio device or an NDI network
source), transcribes it in real time with a local [whisper.cpp](https://github.com/ggml-org/whisper.cpp)
model (Metal-accelerated), and displays captions on a connected display and/or
publishes them as a live NDI source — built for Destiny Church's AVL setup
(ATEM, ProPresenter, Dante, NDI).

See the plan this was built from for full architecture and phase details.

## Prerequisites (per machine)

This app was scaffolded on a machine with **only the Xcode Command Line
Tools** installed (no full Xcode). You need, before anything here will build:

1. **Xcode 26**, from the App Store or [developer.apple.com](https://developer.apple.com/xcode/) —
   required for the macOS 26 SDK, which is what unlocks the real Liquid Glass
   APIs (`glassEffect()`, `GlassEffectContainer`) used in the UI. After
   installing, run `sudo xcode-select -s /Applications/Xcode.app` and confirm
   with `xcodebuild -version`.
2. **CMake** (`brew install cmake`) — needed to build whisper.cpp.
3. **XcodeGen** — already installed on the machine this was scaffolded on
   (`brew install xcodegen` if not).
4. **An NDI SDK license** — free, from [ndi.video](https://ndi.video/for-developers/ndi-sdk/) —
   see `Vendor/NDI/README.md`. This is a click-through EULA, not something
   that can be scripted end-to-end.
5. A whisper.cpp model file — fetched via `Scripts/fetch-whisper-model.sh`,
   not committed (multi-GB).

## First-time setup

```bash
make whisper-build   # clones the whisper.cpp submodule, builds it with Metal
make ndi-setup        # copies the installed NDI SDK's headers/lib in (see Vendor/NDI/README.md)
./Scripts/fetch-whisper-model.sh large-v3-turbo
make build
```

`make build` (and `make project`) will fail with a clear error if either
vendor step hasn't been run — see the `Makefile`.

## Phase 1 benchmark

The scope doc's single biggest risk is latency drift over a full ~60-90 minute
service. Before any UI work, benchmark both `large-v3-turbo` and `medium` on
the actual target Mac (an **Apple M2 Max**) against a real 20-30 minute speech
recording:

```bash
swift run --package-path Scripts/BenchmarkRTF benchmark-rtf \
  path/to/sermon-sample.wav --model Vendor/Models/ggml-large-v3-turbo.bin
swift run --package-path Scripts/BenchmarkRTF benchmark-rtf \
  path/to/sermon-sample.wav --model Vendor/Models/ggml-medium.bin
```

Exit criterion: the chosen model sustains a real-time factor (RTF) of ≤ 0.5-0.6
with no measurable latency growth from minute 2 to minute 25 of the recording.
`large-v3-turbo` is the starting assumption given the M2 Max's headroom, with
`medium` as the documented fallback if it doesn't clear that bar.

## Licensing notes

- **whisper.cpp**: MIT licensed, vendored as a git submodule at
  `Vendor/whisper.cpp` (pinned to a release tag, not `main`).
- **NDI SDK**: proprietary, license-gated. Its headers/libraries are **not**
  committed to this repo (see `Vendor/NDI/README.md`) — only the compiled
  app's embedded `libndi.dylib` is redistributed, which the NDI SDK license
  permits; redistributing the raw SDK files does not.

Both are credited in the app's About window (`LiveCaption/About/AboutView.swift`).
