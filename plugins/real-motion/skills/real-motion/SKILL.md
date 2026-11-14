---
name: real-motion
description: Make polished promo films, launch videos, product demos and tutorials for SaaS and software products in Remotion, in the Real Motion style - aggressive ease-in-out motion, masked word reveals, devices rising into place, camera punch-ins on the real UI, short crossfades - using real screenshots of the product captured with Playwright against pretend data. Use when asked for a promo, launch, explainer, ad, sizzle, feature or product video, an app or website demo, a tutorial or walkthrough video, or a video thumbnail, for any web or mobile product.
---

# Real Motion

Product films that feel expensive: every move uses one aggressive ease (slow start, very fast
middle, long soft landing), nothing drifts or bounces, holds are perfectly still, and the product
on screen is the real one. The same kit makes two kinds of film:

- **Promo films** (20 to 90 s): launch videos, ads, feature announcements, homepage loops.
- **Walkthroughs** (1 to 9 min): tutorials, onboarding and help videos, feature demos, with a
  cursor, clicks, camera punch-ins and captions over real captured steps.

## The kit

Everything is in this skill's `assets/`. Copy it into the project, don't retype it:

| File | What it gives you |
| --- | --- |
| `assets/kit/theme.ts` | `EASE` (the house curve), colour and font tokens to set to the brand. |
| `assets/kit/motion.tsx` | `kf()` (keyframes with the house ease), `Exit`, `Rise`, `Enter`, `RevealText`, `Headline`, `Kicker`, `Body`, `WordSwap`, `CountUp`, `Typewriter`, `PunchIn`/`usePunch`, `Highlight`, `Cursor`, `Stagger`, `Page`, `Center`. |
| `assets/kit/frames.tsx` | `BrowserFrame` and `PhoneFrame`, drawn in code, so there are no bezel images to license. |
| `assets/kit/ExamplePromo.tsx` | A complete promo: hook, problem, product reveal, features, mobile, proof, CTA. |
| `assets/kit/Walkthrough.tsx` | `defineWalkthrough()`: turns a captured step list into a full tutorial film. |
| `assets/capture/record.cjs` | Playwright recorder: steps with before/after frames and cursor targets, or promo stills. |
| `assets/capture/contact-sheet.py` | Contact sheets of captured steps, to check before rendering. |
| `assets/capture/chapters.mjs` | YouTube chapter timestamps for a walkthrough. |

## Setting up

1. **Look first.** If the repo already has a Remotion project or video notes (a README in the
   video folder), read them and extend what's there. Reuse its theme, fonts and assets.
2. **New project:** `npx create-video@latest --blank` (or add `remotion`, `@remotion/cli` and
   `@remotion/transitions` at the same exact version to an existing package). Copy
   `assets/kit/*` into `src/kit/` and `assets/capture/*` into `capture/`. Playwright is needed for
   capture (`npm i -D playwright`).
3. **Brand it:** set `C` (page, ink, muted, accent, accentBright, dark) and `F` (display, body,
   label) in `theme.ts`. Load the brand's fonts with `@remotion/fonts` from files in `public/fonts`
   so renders never depend on the network. Keep `EASE`.
4. Register compositions in `Root.tsx`: 1920x1080 at 30 fps for landscape; add 1080x1920 (stories,
   reels) or 1080x1080 (feeds) versions by laying the same scenes out again, not by cropping.

## The motion rules

The style lives or dies on these. Details and timings: [references/motion.md](references/motion.md).

- **One ease for everything:** `kf(frame, [a, b, …], [x, y, …])` uses `EASE` =
  `bezier(0.86, 0, 0.07, 1)`. No springs, no linear moves, no CSS transitions. Camera moves under
  other motion (walkthroughs) use `EASE_SOFT`.
- **Move, then hold perfectly still.** A keyframe pair per move; between moves, nothing changes.
- **Things enter with purpose:** headlines reveal word by word from behind a mask (4-frame
  stagger), devices rise from below (`Rise`, about 46 frames), copy fades up 26 px.
- **Every scene leaves on its own** (`Exit`: lift and fade over the last 22 frames), so the
  crossfade between scenes is only 8 frames. Never a long dissolve.
- **Punch in on the point.** `PunchIn` zooms 1.6 to 2.2x into the part of the UI that matters
  (36 frames in, hold, 36 out), and the copy beside it fades by `usePunch` so it's never covered.
- **Pace:** a scene is 3 to 6 s. A headline needs about 0.3 s a word plus 1 s to land.
- **Restraint:** light pages, one accent colour, no glows, gradients, particles or emoji.
  Big type (90 to 150 px), tight tracking (-0.035em), generous space.

## Making a promo

Full craft notes, script templates and formats: [references/promo.md](references/promo.md).

1. **Brief:** who it's for, the one thing they should remember, where it plays (site hero, social,
   launch post, ad) and how long (15, 30, 45 or 60 to 90 s).
2. **Script as scenes:** hook (the promise, 3 s) → problem (the pain, said plainly) → product
   appears → 2 to 4 features, each one benefit shown in the real UI → proof (numbers, logos,
   quote) → call to action (name, promise, URL). Write every line first; cut until each scene
   says one thing in under 10 words.
3. **Capture the real product** (next section) at the sizes the scenes need: full pages for
   `BrowserFrame`, phone viewport for `PhoneFrame`, and sequences of frames for typing or a
   result appearing.
4. **Build scenes** from `ExamplePromo.tsx`: a `TransitionSeries` with 8-frame fades, each scene
   wrapped in `Exit`, laid out with the kit's pieces.
5. **Check stills** at the key frames of each scene (`npx remotion still … --frame=N`) and look at
   them: overlaps, text running into devices, empty screens. Then render.

## Making a walkthrough

1. **Plan:** one audience per video. List every page and action from the code (routes, buttons,
   what each one really does). Parts of 3 to 8 steps, in the order someone learns them.
2. **Capture** with `capture/record.cjs`: `t.part(name, fn)`, `t.step(caption, locator, action,
   { zoom, hold, typing, wait })`, `t.look(caption, locator, { zoom, hold })`. See
   [references/capture.md](references/capture.md).
3. **Check** every contact sheet (`python3 capture/contact-sheet.py …`): wrong boxes, empty states,
   errors, pop-ups that should have closed, captions that don't match the screen. Re-film until
   clean.
4. **Compose:** `defineWalkthrough({ dir, steps, kicker, title, accent, blurb, outro, end, music })`
   returns `{ Component, frames }` to register. Render, then check the duration and a few frames.
5. **Publish:** poster still, thumbnail, chapters (`node capture/chapters.mjs …`), description
   with the music credit, and a listing on the product's help page if it has one.

## Capturing the real product safely

The film shows the real interface with invented data. Full method:
[references/capture.md](references/capture.md).

- **Pretend data only:** invented names and `@example.com` emails. Never a real account, inbox,
  customer or private message.
- **Nothing real is touched:** point the app at a stand-in (an API answered in the browser with
  `ctx.route`, a fake backend, or a seeded local database). Payment, email, AI and other third-party
  keys stay unset.
- A stand-in session signs the browser in as a pretend user with exactly the right permissions.
- Swap `localhost` for the real domain on screen before each screenshot (`realHost`).
- **Captions and claims tell the truth:** read the code behind each button before describing it.
  In promos, every number and claim must be real and approved by the user. Never invent customer
  logos, quotes or stats.

## Thumbnails

1280x720, rendered as a Remotion `<Still>`:
- **Left:** the subject in big type, plus a short promise.
- **Right:** a real screen from the film running off the edge, inside `BrowserFrame` or a rounded
  card.
- Keep the brand colours and type, use one accent, and keep the text readable at phone size.
- Name the file after the video's title when handing it over.

## Always

- **Music:** use only tracks the user can license. Put the credit wherever the licence asks,
  including the video description.
- **Repo hygiene:** don't commit rendered videos or captured frames to git; commit the scripts,
  step lists and stills.
- **Delivery:** hand the user the MP4 (CRF about 18), the thumbnail and the description text.
  Claude can't upload to YouTube or social platforms.
- **Final check:** before handing over, check the render with `ffprobe` (duration, audio) and look
  at frames from the start, middle and end.
