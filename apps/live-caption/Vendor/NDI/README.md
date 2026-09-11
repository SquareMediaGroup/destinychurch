# NDI SDK — not vendored here

This directory is intentionally empty in git. The NDI SDK (Vizrt/NewTek) is
distributed under a click-through EULA that generally does **not** permit
redistributing its headers/libraries in a public or third-party source
repository. What the license *does* permit is embedding the compiled runtime
library (`libndi.dylib`) inside your own app bundle — which is what
`make ndi-setup` and the app's build (Copy Files build phase) do, once you've
installed the SDK yourself.

## One-time setup (per machine)

1. Go to <https://ndi.video/for-developers/ndi-sdk/> and create an account.
2. Download **"NDI SDK for Apple"** (the free, standard SDK — this app only
   needs `NDIlib_find_*`, `NDIlib_recv_*`, `NDIlib_send_*`, all of which are in
   the standard SDK; the paid NDI Advanced SDK is not needed unless a future
   feature specifically requires it).
3. Run the installer. It installs to `/Library/NDI SDK for Apple` by default.
4. From `apps/live-caption/`, run:
   ```bash
   make ndi-setup
   ```
   This copies `include/` and `lib/macOS/libndi.dylib` from the installed SDK
   into this directory (both gitignored — see `../../.gitignore`).
5. `xcodegen generate` / `make build` will now find `Processing.NDI.Lib.h` and
   link against `libndi`.

If you skip this step, `make build` fails fast with a clear error rather than
a cryptic linker error further down the line.

## Distribution note

When this app is actually distributed/installed on the production Mac, its
`.app` bundle must embed `libndi.dylib` (a "Copy Files" build phase, already
configured in `project.yml`/the Xcode project) and have its install name /
rpath fixed up so it loads from inside the bundle rather than expecting the
SDK to be installed system-wide on every machine that runs the app. This is
the redistribution the NDI license actually allows — distinct from committing
the SDK's own files to source control, which it does not.
