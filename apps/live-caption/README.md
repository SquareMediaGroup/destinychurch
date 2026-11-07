# Live Caption

A macOS app that captures live audio (Core Audio device or an NDI network
source), transcribes it in real time with a local [whisper.cpp](https://github.com/ggml-org/whisper.cpp)
model (Metal-accelerated), and displays captions on a connected display and/or
publishes them as a live NDI source — built for Destiny Church's AVL setup
(ATEM, ProPresenter, Dante, NDI).

Audio never leaves the machine: transcription is entirely local.

## Prerequisites (per machine)

1. **Xcode 26**, from the App Store or [developer.apple.com](https://developer.apple.com/xcode/) —
   required for the macOS 26 SDK, which is what unlocks the real Liquid Glass
   APIs (`glassEffect()`) used by the caption plate. After installing, run
   `sudo xcode-select -s /Applications/Xcode.app` and confirm with
   `xcodebuild -version`.
2. **CMake** and **XcodeGen** (`brew install cmake xcodegen`).
3. **An NDI SDK license** — free, from [ndi.video](https://ndi.video/for-developers/ndi-sdk/) —
   see `Vendor/NDI/README.md`. This is a click-through EULA, not something
   that can be scripted end-to-end.
4. A whisper.cpp model file — fetched via `Scripts/fetch-whisper-model.sh`,
   not committed (multi-GB).

## First-time setup

```bash
make whisper-build    # clones the whisper.cpp submodule, builds it with Metal
make ndi-setup        # copies the installed NDI SDK's headers/lib in (see Vendor/NDI/README.md)
./Scripts/fetch-whisper-model.sh large-v3-turbo
./Scripts/fetch-whisper-model.sh silero-v5.1.2   # speech detection, filters applause/music/noise
make build
```

`make build` (and `make project`) will fail with a clear error if either
vendor step hasn't been run — see the `Makefile`.

## Running a service

`make run`, or open the built app. The control window is everything needed
live:

- **Input** — pick an audio source (any Core Audio device: Dante Virtual
  Soundcard, BlackHole, a physical interface; or an NDI source on the
  network) and a model, then Start. `Cmd-Return` toggles it.
- **Output** — send the caption to a connected display (borderless,
  above the menu bar, on whichever screen you choose), and/or publish it as
  an NDI source. Both can run at once; both show the same text as the
  in-window preview.
- **Menu bar** — start, stop, and toggle the display without bringing the
  control window forward, since during a service the operator is usually in
  ProPresenter.

Models are looked up in `~/Library/Application Support/Live Caption/Models`
and, during development, in this checkout's `Vendor/Models`.

### NDI output

The NDI source sends BGRA frames with a **transparent background** so a
switcher (ATEM, vMix, OBS) can key the captions straight over program video —
no physical output feed from the Mac required. Glyphs are white with a black
outline so they survive being composited over both a bright stage wash and a
dark set. Source name and resolution are in Settings > NDI Output; changes
take effect the next time captioning starts.

### NDI network

NDI is pull-based: receivers (ATEM, vMix, OBS, ProPresenter) connect to this
Mac; nothing is pushed to a destination address. Settings > NDI Network
controls where that happens:

- **Network interfaces**: this Mac's own IPs that NDI may use. Set it to the
  AV network's address when the Mac also has Wi-Fi.
- **Discovery servers**: NDI Discovery Server addresses, for receivers on
  another subnet or networks that block mDNS.
- **Find sources at these IPs**: machines queried directly for NDI *input*
  sources, without mDNS.
- **Multicast**: send by multicast from a chosen address range and TTL.

The standard NDI SDK reads these once per process, from an
`ndi-config.v1.json` the app writes to
`~/Library/Application Support/Live Caption/NDI/` and points the SDK at with
`NDI_CONFIG_DIR`, so **a change needs an app restart**. Left at defaults, the
app writes nothing and NDI uses the machine-wide config (NDI Tools / Access
Manager). Ports are fixed by NDI and not configurable in the standard SDK:
TCP 5960, TCP 5961 upward per stream, 7960 upward when sending, 5959 for a
discovery server, UDP 5353 for mDNS. Open those on any firewall in between.

### Applause, music and noise

Whisper is a speech-to-text model, not a sound classifier. On applause or
music it often writes a label ("[Applause]", "(music)", "♪") and on noise or
silence it can invent words ("Thanks for watching"). Three layers keep that
off screen:

1. **Silero VAD** (`SpeechDetector`): a window with no detected speech is
   never sent to whisper, and words placed well outside any speech are
   dropped. Needs `ggml-silero-v5.1.2.bin` in the Models folder; without it
   the app transcribes everything and says so in the status line. Toggle in
   Settings > Transcription.
2. **Label stripping** (`TranscriptCleaner`): anything in `[...]`/`(...)`
   and music symbols are removed.
3. **No-speech probability and stock outros**: segments whisper itself rates
   as probably not speech (> 0.8), and known subtitle outros, are dropped.

Applause *during* speech (a congregation clapping along under a preacher)
is still transcribed: VAD sees speech in it, which is correct.

### Caption stability

whisper.cpp re-transcribes overlapping windows, so recent words can change
before they settle. Showing that raw makes captions visibly churn. Words are
therefore held back until they've survived unchanged for the **stability
delay** (Settings > Transcription) — higher is steadier but lags the speaker,
lower shows words sooner but lets them rewrite themselves on screen. Words
that have passed the sliding window's re-transcription horizon are
structurally final and appear immediately regardless.

### Vocabulary

Settings > Vocabulary biases decoding toward names the model would otherwise
miss — speakers, local place names. The 66 books of the Bible are included by
default. This is a decoding bias, not a dictionary: only the first
`VocabularyPrompt.maxWordCount` words are sent, custom terms first, because a
bloated prompt crowds out real audio context and hurts accuracy.

## Packaging (.dmg)

```bash
make dmg
```

Builds Release and writes `build/Live-Caption-<version>.dmg` (drag the app to
Applications). It checks that `libndi.dylib` is embedded and loads from inside
the app, so the church Mac doesn't need the NDI SDK installed.

- **Signing**: ad-hoc by default. That opens on the Mac that built it; on any
  other Mac the first launch is blocked until it's allowed in System Settings >
  Privacy & Security > Open Anyway. For a DMG that opens anywhere:
  `make dmg SIGN_IDENTITY="Developer ID Application: …" NOTARY_PROFILE=<profile>`
  (needs an Apple Developer account; the profile comes from
  `xcrun notarytool store-credentials`).
- **Models are not in the DMG** (multi-GB). On the target Mac, put
  `ggml-large-v3-turbo.bin` and `ggml-silero-v5.1.2.bin` in
  `~/Library/Application Support/Live Caption/Models` (Settings >
  Transcription > Open Models Folder).

## Benchmarking

The scope doc's single biggest risk is latency drift over a full ~60-90 minute
service. Benchmark a model on the actual target Mac (an **Apple M2 Max**)
against a real 20-30 minute speech recording:

```bash
swift run --package-path Scripts/BenchmarkRTF benchmark-rtf \
  path/to/sermon-sample.wav --model Vendor/Models/ggml-large-v3-turbo.bin
```

Exit criterion: the chosen model sustains a real-time factor (RTF) of ≤ 0.5-0.6
with no measurable latency growth from minute 2 to minute 25 of the recording.
`large-v3-turbo` is the starting assumption given the M2 Max's headroom, with
`medium` as the documented fallback if it doesn't clear that bar.

## Layout

| Path | What's in it |
| --- | --- |
| `LiveCaption/Audio` | `AudioSource` abstraction, Core Audio and NDI inputs, 16kHz mono resampler both converge on |
| `LiveCaption/Transcription` | whisper.cpp wrapper, sliding-window streaming transcriber, vocabulary prompt, model catalog |
| `LiveCaption/Captioning` | Stability debounce and the `CaptionStore` every display reads from |
| `LiveCaption/Output` | NDI caption publisher and its BGRA frame renderer |
| `LiveCaption/UI` | Control panel, caption display, full-screen window management, settings |
| `Scripts/BenchmarkRTF` | Standalone RTF/latency harness |

## Licensing notes

- **whisper.cpp**: MIT licensed, vendored as a git submodule at
  `Vendor/whisper.cpp` (pinned to a release tag, not `main`).
- **NDI SDK**: proprietary, license-gated. Its headers/libraries are **not**
  committed to this repo (see `Vendor/NDI/README.md`) — only the compiled
  app's embedded `libndi.dylib` is redistributed, which the NDI SDK license
  permits; redistributing the raw SDK files does not.

Both are credited in the app's About window (`LiveCaption/About/AboutView.swift`).
