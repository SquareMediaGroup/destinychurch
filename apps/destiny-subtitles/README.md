# Destiny Subtitles

Mac app for Destiny Church: NDI audio in, live AI subtitles, NDI video out (transparent background) for the BirdDog. Rust engine, Tauri + React operator window. Replaces `apps/live-caption`.

Status: phase 2. A command-line captioner works end to end on a recording; the NDI path is written but untested against a real SDK. The operator UI is still a stub.

## Try it

Needs `cmake` (`brew install cmake`) and a whisper model:

```bash
cd apps/destiny-subtitles
curl -L -o ggml-tiny.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin   # small, for testing
cargo test -p engine
cargo build --release -p engine --features metal --bin captioner      # use --features whisper on an Intel Mac
./target/release/captioner wav sermon.wav --model ggml-tiny.en.bin --png frame.png
```

On the Apple Silicon Mac use `ggml-large-v3-turbo.bin` and aim for a real-time factor of 0.5 or lower. For NDI, install the NDI SDK from ndi.video, then:

```bash
./target/release/captioner sources
./target/release/captioner run --in "FOH-MAC (SANCTUARY-MIX)" --out DESTINY-SUBTITLES --model ggml-large-v3-turbo.bin
```

Layout: `crates/engine` (pure Rust plus CLI), `src-tauri` (Tauri shell), `src` (UI). Placeholder icons are copied from D1 Admin and need replacing.
