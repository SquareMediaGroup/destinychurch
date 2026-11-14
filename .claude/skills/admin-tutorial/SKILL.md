---
name: admin-tutorial
description: Make or re-film an admin help tutorial video for Destiny Admin (/admin) - filmed on the real admin against a pretend database, animated in Remotion, with a poster, YouTube thumbnail, chapters and a /admin/help entry. Use when asked to make a tutorial or help video for an admin role or section, to update one after a page changed, or to make its thumbnail.
---

# Admin help tutorials

Every admin role has a tutorial: a real walkthrough of /admin, filmed by a script and animated
with a cursor, clicks, camera zooms and captions. They live in `apps/campaign-videos` and play
on /admin/help from YouTube. This is the whole recipe, from mapping a role to a finished video.

The pieces, all in `apps/campaign-videos`:

| Piece | What it is |
| --- | --- |
| `capture/tutorial-kit.cjs` | Drives a signed-in browser through /admin and records each step. Its header has the setup. |
| `capture/admin-mock-supabase.cjs` | A pretend Supabase (tables, storage, auth, RPCs) the real API routes talk to. |
| `capture/<id>-seed.cjs` | The pretend data for one tutorial. |
| `capture/<id>-tutorial.cjs` | The walkthrough script for one tutorial. |
| `capture/d1-fake-api.cjs` | Answers `/api/admin/destiny-one/*` in the browser (Destiny One and Safeguarding). |
| `capture/inventory.cjs` | Lists every heading, button, field and link on admin pages, to plan a script. |
| `src/Tutorial.tsx` | `defineTutorial()`: intro, chapter cards, step scenes, outro, music. |
| `src/<Name>Tutorial.tsx` | The two-line composition for one tutorial, registered in `src/Root.tsx`. |
| `src/Thumbnails.tsx` | YouTube thumbnails, one `Thumb-<id>` still per video. |
| `scripts/contact-sheet.py` | Checks a filmed tutorial's frames before rendering. |
| `scripts/youtube-chapters.mjs` | Prints the chapter timestamps for the YouTube description. |
| `lib/adminHelpVideos.ts` (repo root) | The list /admin/help shows. |

## Rules that always hold

- **Invented people only.** Every name, email and message in a seed is made up (`@example.com`).
  Public church content is fine: real shop photos, public events, the public podcast feed.
- **Nothing reaches a real service or the live database.** The filming site points Supabase at the
  mock. Leave Stripe, Buzzsprout, Playbook, YouTube and OpenAI keys unset; email goes to the mock.
  A step that needs an outside service is answered in the browser (`t.ctx.route`) or explained in
  the caption without pressing it. Never film Destiny One messages from the real database.
- **Captions must be true.** Check each one against the code before filming: what the button
  really does, what it doesn't (for example "Mark refunded" changes the status; no money moves).
  Use the page's real labels. UK spelling, plain words, no emojis on screen.
- **Video files never go in git.** Frames (`public/tutorial/`) and renders (`out/`) are
  gitignored. Commit the scripts, seeds, step list (`src/tutorials/<id>-steps.json`), composition,
  poster, thumbnail source frame and help entry. Send the finished MP4 to the user for YouTube.
- **The music credit** goes on /admin/help (already there) and in every YouTube description:
  "Inspired" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0.
- Branch from `origin/main`, open a PR, merge only when the user says so (see CLAUDE.md).

## 1. Map the role

1. Find the role's pages in `lib/adminNav.ts` (`role:` on each item) and read each page and the API
   routes it calls (`app/api/admin/...`). Note every action, the request it sends and the tables
   and RPCs the route touches.
2. With the filming site running (step 3), list what's on screen:
   `ROLES_FILE=<file> node capture/inventory.cjs <role> <outDir> /admin/page /admin/other`
3. Plan parts of 3 to 8 steps each, in the order a new admin would learn them: finding your way,
   then the main jobs, then the rarer ones. Aim for every action the role can take, with hold-only
   `look` steps for anything that can't be pressed safely.

## 2. Pretend data

Write `capture/<id>-seed.cjs`. Copy the shape of an existing one (`design-seed.cjs` is short,
`events-seed.cjs` and `site-seed.cjs` use RPCs). It exports `() => ({ table: [rows] })` plus, as
needed:

- `defaults`: columns the database would fill in. A page that 500s often wants a missing column.
- `embeds` / `toOne`: relations the routes select (`alias:table(*)`).
- `rpc`: database functions the routes call, written as JS over the in-memory tables.
- `serial`: tables with numbered ids. `files`: storage objects to preload.
- Hide the onboarding tour: `admin_onboarding: [{ auth_user_id: 'u-admin', completed_steps: [], gate_seen: true, dismissed: true }]`.

Use dates near "now" so lists look current, and enough rows that filters and counts mean something.

If a section's routes lean on many database functions (Destiny One does), answer its API in the
browser instead, as `capture/d1-fake-api.cjs` does: a stateful `ctx.route()` handler shaped like
the real responses (types in `packages/shared`). The pages are still the real ones.

## 3. Start the filming site

Two processes, restarted before every full run (a run changes the data it starts from):

```bash
S=<scratch dir>; echo <role> > $S/roles.txt      # e.g. store_admin; comma-separate several
cd apps/campaign-videos
PORT=54399 ROLES_FILE=$S/roles.txt SEED=capture/<id>-seed.cjs node capture/admin-mock-supabase.cjs &

# In a website checkout (a separate worktree keeps the main checkout clean):
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=demo \
SUPABASE_SECRET_KEY=demo RESEND_API_KEY=re_filming RESEND_BASE_URL=http://localhost:54399/resend \
npx next dev -p 80
```

That checkout's `next.config.ts` needs, **locally only, never committed**: an images
`remotePatterns` entry for `http://localhost:54399` and `dangerouslyAllowLocalIP: true`.
Warm each page once with `curl` before filming: the first compile is slow.

## 4. Write the walkthrough

`capture/<id>-tutorial.cjs`:

```js
const { film } = require('./tutorial-kit.cjs');
film({ id: '<id>', roles: '<role>' }, async (t) => {
  const { page, ctx, part, step, look, go, settle, btn, link, field, main, sidebar } = t;
  await part('Finding your way', async () => {
    await go('/admin');
    await step('Signed in as a … Admin, … is your section.', sidebar().getByRole('link', { name: /…/ }).first(), (l) => l.click(), { hold: 3 });
    await look('What this page is for.', main().getByText('…').first(), { zoom: 1.3, hold: 3.6 });
  });
});
```

- `step(caption, locator, action, opts)`: point, screenshot, act, screenshot. `action` null with
  `typing: { text }` types into the locator. Options: `zoom` (1.3 to 1.8 for small controls),
  `hold` (seconds; longer captions need 3.5 to 4.5), `wait` (ms after acting, for slow saves).
- `look(caption, locator, opts)`: a held screen with a caption, nothing pressed.
- `part(name, fn)`: a chapter. **No commas in part names** (`ONLY` splits on them).
- `btn(name, exact)`, `link(…)`, `field(labelText)`, `main()`, `sidebar()`: visible-only finders.

Selector lessons:

- Accessible names include icon text, so match with a regex (`/^Save/`) or use `getByText`.
- Switches, radios, chips and tabs are often not buttons: use `getByLabel`, `getByText` or the
  label's text.
- A control that exists twice (desktop and mobile copies): add `.locator('visible=true')`.
- Admin pop-ups are `page.locator('[data-tour="modal"]').last()`; confirm and prompt dialogs are
  `page.getByRole('dialog').last()`.
- Collapsed sidebar groups: click the group label before its link.
- "Leave this page?" prompts are accepted automatically.

Film it: `ROLES_FILE=$S/roles.txt node capture/<id>-tutorial.cjs`. While working on one part:
`ONLY="Part name" …` films just that part into `public/tutorial/<id>-only/`. On failure the kit
leaves `failed.png` and `steps.partial.json` in the frames folder.

## 5. Check the frames

```bash
python3 scripts/contact-sheet.py src/tutorials/<id>-steps.json public/tutorial/<id> $S/<id>-0.png 0
python3 scripts/contact-sheet.py src/tutorials/<id>-steps.json public/tutorial/<id> $S/<id>-30.png 30
```

Read every sheet. Look for red boxes in the wrong place (a matched hidden or duplicate element),
empty states where data should be, error toasts, spinners, a pop-up that should have closed, and
captions that no longer match the screen. Open single frames at full size where in doubt. Fix and
re-film until clean.

The filming browser shows date inputs as mm/dd/yyyy; that's a known limit, not a bug.

## 6. Render

`src/<Name>Tutorial.tsx`, registered in `src/Root.tsx` next to the others:

```tsx
import manifest from "./tutorials/<id>-steps.json";
import { defineTutorial, type Step } from "./Tutorial";

const tutorial = defineTutorial({
  id: "<id>",
  steps: (manifest as unknown as { steps: Step[] }).steps,
  kicker: "Admin help · <Role> Admin",
  title: "Short headline.",
  accent: ["word"],          // word(s) of the title in orange
  blurb: "Everything a <Role> Admin can do, step by step, on the real admin.",
});
export const <Name>Tutorial = tutorial.Component;
export const <NAME>_TUTORIAL_FRAMES = tutorial.frames;
```

```bash
npm run lint          # eslint + tsc for this project (CI runs it)
npx remotion render <Name>Tutorial out/<Role>-Admin-Tutorial.mp4 --crf=18
# Poster for /admin/help:
ffmpeg -ss 3 -i out/<Role>-Admin-Tutorial.mp4 -frames:v 1 -vf scale=1600:-1 -c:v libwebp -quality 82 ../../public/img/admin-help/<id>-poster.webp
```

In a cloud container, pass `--browser-executable` pointing at the pre-installed Chrome headless
shell. Check the render with `ffprobe` (duration, audio stream) and look at a few frames before
sending it.

## 7. Thumbnail, help entry, YouTube

1. **Thumbnail:** copy one telling frame to `public/thumbnails/<id>.jpg` (resize to 2000 px wide),
   add an entry to `THUMBS` in `src/Thumbnails.tsx` (`lines` for the big type, `hook`, optional
   `focus` to frame the screen), run `npm run thumbnails` and look at `out/thumbnails/<id>.jpg`.
   Name the file after the video's YouTube title when sending it.
2. **Help entry:** in `lib/adminHelpVideos.ts`, give the video its `title`, `description` (what's
   covered), `role`, `poster` and `length` (from the render). Once uploaded, set `youtubeId` (the
   11 characters after `v=`); until then the card shows the poster and "Video coming soon".
3. **YouTube description:** what's covered, the chapters from
   `node scripts/youtube-chapters.mjs <id>`, and the music credit.
4. Send the MP4 and thumbnail to the user (they upload; Claude can't). The playlists are in
   `PLAYLISTS` in `lib/adminHelpVideos.ts`.

## Re-filming one that's out of date

When a page changes or a feature goes, edit that tutorial's script (and seed), restart the mock,
film with `ONLY="Part name"` to check the changed part, then film it whole, check the sheets,
re-render, and update the poster, `length` and thumbnail if they changed. Tell the user to replace
the video on YouTube (a new upload gets a new `youtubeId`; update it). Captions can be fixed
without re-filming by editing `src/tutorials/<id>-steps.json`; keep its formatting.

## Finish

Run `npm run lint` in `apps/campaign-videos` and the root `npx tsc --noEmit` plus
`npx playwright test --project=unit` if site files changed. Keep `apps/campaign-videos/README.md`
and `REPOSITORY_DOCUMENTATION.md` in step with any new tutorial, then commit, push and open a PR.
