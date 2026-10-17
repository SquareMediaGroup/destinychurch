# Destiny Subtitles

Mac app for Destiny Church: NDI audio in, live AI subtitles, NDI video out (transparent background) for the BirdDog. Rust engine, Tauri + React operator window. Replaces `applications/live-caption`.

Status: phase 1 (scaffold, engine logic, tests). No audio, whisper or NDI yet.

```bash
cd applications/destiny-subtitles
cargo test -p engine      # engine unit tests
npm install
npm run tauri:dev         # needs a Mac
```

Layout: `crates/engine` (pure Rust), `src-tauri` (Tauri shell), `src` (UI). Placeholder icons are copied from D1 Admin and need replacing.
