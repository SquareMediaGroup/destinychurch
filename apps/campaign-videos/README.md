# Campaign videos

Two 1080p launch films made with [Remotion](https://www.remotion.dev): the refreshed website first,
then "Oh, and one more thing" and Destiny One. They share everything except the ending.

| Composition | Ending | Length |
| --- | --- | --- |
| `ComingIn2027` | Destiny One, "Coming in 2027", destinytees.uk/app | 3:30 |
| `DownloadToday` | "Download today", App Store badge, destinytees.uk/app | 3:30 |
| `DestinyOneFilm` | Destiny One alone, in more depth, with music; "Coming in 2027". Plays on /app | 1:03 |

Finished renders are kept in `exports/` (the 4K `DownloadToday` and `Destiny-One-Film.mp4`) so they can be
downloaded from GitHub; `out/` stays ignored for working renders.

## Commands

```bash
npm install
./scripts/get-bezels.sh          # Apple's device frames, once (needs 7z); see "Device frames" below
npm run dev                      # Remotion Studio, to preview and tweak
npx remotion render ComingIn2027 out/ComingIn2027.mp4
npx remotion render DownloadToday out/DownloadToday.mp4
npx remotion render DestinyOneFilm out/Destiny-One-Film.mp4
npm run lint                     # eslint + tsc
```

In a cloud container without Chrome, add `--browser-executable=/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`.
`node scripts/stills.mjs <id> <outDir> <everyNFrames>` renders sample frames for a quick check.
`node scripts/export-stills.mjs` writes every screen as a 1920x1080 image to `stills/` (committed), with matching
before/after pairs for sliders in `stills/before-after/`. See `stills/README.md`.

## What's in here

- `src/Campaign.tsx` — the timeline (one `TransitionSeries`). `CAMPAIGN_FRAMES` at the bottom must match it.
- `src/scenes/website.tsx`, `src/scenes/app.tsx` — the scenes. `src/ui.tsx` — headline reveal, browser and phone frames, glow.
- `public/brand/` — official assets only: the Destiny Church logo and icon (from `public/img/brand`), the
  Destiny One app icon (`apps/destiny-one/assets/icon.png`), and Apple's App Store badge, used unmodified.
- `public/bezels/` (gitignored) — Apple's iPhone 18 Pro and MacBook Pro 14" frames; see below.
- **Performance figures** (`PerformanceScene`, shown as bar charts: 3.5× slower, 94% less data, 96 vs 71 accessibility): Google Lighthouse 12.8, mobile, median of three runs on each
  home page (destinytees.uk vs destinychurch.vercel.app), 3 Nov 2026. Old → new: performance 36 → 90,
  accessibility 71 → 96, LCP 7.3 s → 2.1 s, page weight 13.7 MB → 0.8 MB (also FCP 2.8 → 1.1 s, CLS 0.354 → 0,
  SEO 92 → 100). Re-run before reusing them: `npx lighthouse <url> --only-categories=performance,accessibility`.
- `public/site/`, `public/app/` — real screenshots of the website (the dev site, destinychurch.vercel.app),
  the old site at destinytees.uk (`old-home.jpg`, for the before/after), and Destiny One. Desktop captures
  are 1512x982pt @2x (the MacBook Pro 14" screen); phone captures are 402x812pt @3x (the iPhone 18 Pro
  screen below its 62pt status bar). Remake them with the scripts in `capture/` when the site or app changes.
- `public/fonts/` — Roboto and Dosis (brand guide) and Anton, Google Fonts' variable files (SIL OFL), kept
  locally so renders don't depend on fonts.gstatic.com.

## Things to know

- **The Destiny One screens use sample data.** Every person in them is made up (Jordan Ellis, Priya Shah…);
  the events and sermons are the church's real public ones. See `capture/destiny-one-sample-data.cjs`.
- **Music.** The campaign films have none (post-production adds it). `DestinyOneFilm` uses "Inspired" by
  Kevin MacLeod (incompetech.com), `public/audio/inspired.mp3`, licensed under Creative Commons: By Attribution
  4.0 (https://creativecommons.org/licenses/by/4.0/). The licence needs that credit wherever the film is shown;
  /app has it under the player. Swap the file in `DestinyOneFilm.tsx` to change the track.
- **The web copy of the film** on /app is `public/img/destiny-one/film.mp4` (re-encoded, CRF 22, faststart)
  with `film-poster.webp`. After re-rendering:
  `ffmpeg -i out/Destiny-One-Film.mp4 -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart ../../public/img/destiny-one/film.mp4`
- The glass tab bar on Destiny One screens is drawn in the video, because the app's web build (used for the
  screenshots) shows its tabs differently. The status bar (9:41) is drawn too.
- Look: light pages, no glows, and every move uses one aggressive ease in and out (`EASE` in
  `src/theme.ts`, applied through `kf()` keyframes in `src/ui.tsx`).

## Device frames

The iPhone and MacBook frames are Apple's own product bezels from
[Apple Design Resources](https://developer.apple.com/design/resources/). `scripts/get-bezels.sh` downloads
them into `public/bezels/`, which is gitignored: Apple's licence doesn't allow redistributing them, and only
allows mock-ups of software that runs only on Apple platforms. That is why these films show Destiny One for
iOS only (App Store badge, no Android or Google Play). Read `Apple Design Resources License.rtf` in each
download before changing how they're used. Renders fail without the frames, so run the script first.
- Copy in the safety scene mirrors the rules the server enforces (README in `apps/destiny-one`). Don't add
  "encrypted" or a lock: chats are reviewable by the safeguarding team.
- Remotion is free for individuals, non-profits and companies of up to 3 people; see remotion.pro/license.

- The endings point to **destinytees.uk/app**, which doesn't exist yet (404 on 3 Nov 2026). Build it before the films go out.
