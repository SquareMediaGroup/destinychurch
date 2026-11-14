---
name: tutorial-video
description: Make a tutorial, walkthrough, how-to or product demo video of software - a website, web app, admin dashboard or mobile app - filmed on the real interface with pretend data, then animated with a cursor, clicks, zooms and captions in Remotion, with a thumbnail and chapters. Use whenever asked for a tutorial, help, onboarding, training or demo video of an app or page, to re-film one after the interface changed, or to make its thumbnail.
---

# Tutorial videos of real software

The method: drive the real interface with a browser script that records a "before" and "after"
screenshot of every step and where the cursor goes, then animate those frames into a video. The
viewer sees the actual product. The data on screen is invented, so nobody's real details appear
and nothing real is changed.

It works for anything that runs in a browser: websites, admin dashboards, web apps, and mobile apps
that have a web build (Expo, React Native Web, Flutter web). For a native-only app, use screen
recordings instead of this method.

## Rules that always hold

- **Invented people and data only.** Names, emails, messages and orders are made up
  (`@example.com`). Public content the organisation already publishes (products, events, its own
  photos) is fine. Never film a real account, inbox or private message.
- **Nothing real is changed or contacted.** The app talks to pretend data, not a production
  database. Payment, email, AI and other third-party keys stay unset. Anything that needs an
  outside service is answered with a stand-in or explained in a caption, never pressed for real.
- **Captions tell the truth.** Read the code behind each button before describing it, and say what
  it does and doesn't do. Use the interface's own labels, the user's spelling conventions and
  plain words.
- **Videos aren't committed to git.** Commit the scripts, data, step lists and stills; hand the
  rendered MP4 to the user for hosting (YouTube, the website, a shared drive).
- **Music needs a licence the user can meet.** Credit it wherever the licence asks, including the
  video description.

## 1. Plan

1. Who is it for, and what should they be able to do afterwards? One audience per video: a role,
   a feature, or a first-time user.
2. List every page and action in scope from the code: the routes, the nav, what each button sends
   and what the server does with it. A script that lists a page's headings, buttons, fields and
   links speeds this up.
3. Split it into parts (chapters) of about 3 to 8 steps, in the order someone would learn them:
   finding your way, the main jobs, then the rarer ones. Each step is one click, one typed field
   or one thing pointed at. Aim for 1 to 9 minutes; split anything longer into two videos.

## 2. Make a safe copy to film

The real interface, pointed at pretend data. Pick the lightest option that works:

| Option | When | How |
| --- | --- | --- |
| **Stand-in API in the browser** | Few endpoints, or the backend is hard to fake | Answer the app's API calls in Playwright (`context.route`) from a small stateful JS store, shaped like the real responses. |
| **Stand-in backend service** | The app's own server routes should run unchanged | Point the app's database or service URL at a small local stand-in (for example a fake PostgREST/Supabase) seeded with invented rows. |
| **Seeded test database** | A local or branch database exists | Load invented seed data into it; never point at production. |

Then:

- **Signed in, no real account.** Give the browser a stand-in session (a cookie or local storage
  token the app accepts locally) for a pretend user with exactly the permissions the video is for.
- **Seed what the screens need.** Enough rows that lists, filters and counts look real; dates near
  today; a few items in each state (draft, live, done) so every badge appears. A page that errors
  usually wants a missing column, relation or server function in the pretend data.
- **Same addresses as the real site.** If the local copy shows `localhost` in links or share URLs,
  swap the text for the real domain just before each screenshot. Don't remap the real domain to
  the local copy; that tends to break the app's scripts.
- Warm each page once before filming; first loads in dev mode are slow.

## 3. Script the walkthrough

A Playwright script that records each step as:

```json
{ "chapter": "Part name", "caption": "What happens and why.", "kind": "click | type | point | none",
  "target": { "x": 0.41, "y": 0.22, "w": 0.08, "h": 0.04 },
  "before": "s012.jpg", "frames": ["s013.jpg"], "after": "s014.jpg",
  "zoom": 1.5, "hold": 3, "nav": false }
```

`target` is the element's box as fractions of the viewport (taken from the before screenshot).
`zoom` is how far the camera punches in, from 1 to 1.8 for small controls. `hold` is the seconds
the result stays up: about 2.2 for short captions and 3.5 to 4.5 for long ones. `nav` marks a step
that opened another page. Save all the steps as `{ viewport, steps }`.

Two kinds of step cover nearly everything:

- **step:** point at an element, screenshot, act (click, type in two or three bites, choose),
  screenshot again.
- **look:** a held screen with a caption, optionally pointing at something. Use it for anything
  that mustn't or can't be pressed.

Write it to be re-run: one function per part, and the ability to film a single part on its own
while working on it. When a run fails, save the last screenshot and the steps so far.

**Finding elements.** These lessons came from filming eleven videos:

- Accessible names often include icon text. Match with a regex or by visible text.
- Switches, radios, chips and tabs often aren't buttons. Find them by label or text.
- Responsive apps keep hidden duplicates of controls. Always take the visible one.
- Modals and confirm dialogs: scope lookups to the topmost one, or two "Save" buttons collide.
- Collapsed menus have to be opened before their links can be clicked.
- Auto-accept "leave this page?" prompts, or navigation stalls.
- Wait after slow saves before the after screenshot (a `wait` option per step).

**Phones:** film the web build at a phone viewport (402×874 at 3×). Present it in a device frame
in the video; the frame should be a licensed bezel or one drawn in code. Draw native-only parts
(status bar, tab bar) in the video if the web build shows them differently.

## 4. Check the frames before rendering

Make contact sheets: a grid of each step's before frame, its number, and a red box on the target.
Read every sheet. Look for:

- a box in the wrong place (it matched a hidden or duplicate element)
- empty lists where data should be, error messages, spinners
- a pop-up that should have closed, or a page that hadn't finished loading
- a caption that doesn't match what's on screen

Open single frames at full size where in doubt. Fix and re-film until it's clean. Rendering is
slow and filming is fast, so catch problems here.

## 5. Animate and render

Remotion turns the step list and frames into the video. Each step shows its before frame, glides
the cursor to the target, plays the click ripple, zooms the camera in, cuts to the after frame and
holds the caption. Around that, the video has:

- an intro card (kicker, headline, one-line summary, chapter list)
- a card before each part
- an outro that says where to get help and how to practise safely
- an end card with the logo
- a quiet music bed and a progress bar

Build this once as a reusable `defineTutorial({ id, steps, kicker, title, blurb })` and give each
video a two-line composition that calls it.

Render at 1920×1080, 30 fps, CRF about 18. Then check the result:

- `ffprobe` shows the expected duration and an audio stream
- frames from the start, middle and end look right

## 6. Publish

- **Poster:** a still from early in the video, for wherever it's embedded before playing.
- **Thumbnail (1280×720):** the subject in big type, a short promise ("Running the shop"), and a
  real screen from the video running off the edge. Render it from code, so a wording change is a
  quick re-render. Name the file after the video's title when you hand it over.
- **Chapters:** compute the timestamps from the same timing the composition uses. Put them in the
  description, with what the video covers and the music credit.
- **Where it plays:** if the product has a help page, list the video with its title, length,
  poster and who it's for. Swap the poster for the hosted embed once you have the video's ID.
- Hand over the MP4, the thumbnail and the description text. Claude can't upload to YouTube.

## Re-filming one that's out of date

Edit the script and the pretend data. Film only the changed part to check it, then film the whole
thing, check the sheets, re-render, and update the poster, length and thumbnail if they changed.
A caption-only fix can be made in the step list without re-filming. A re-uploaded video gets a new
ID, so update every place that embeds it.

## In this repository

Everything above is already built in `apps/campaign-videos`:

- `src/Tutorial.tsx`: `defineTutorial()`
- `src/Thumbnails.tsx`: the thumbnails
- `scripts/contact-sheet.py`: the frame checker
- `scripts/youtube-chapters.mjs`: the chapter timestamps

Two worked setups exist:

- **Destiny Admin (/admin):** a ready kit, a pretend Supabase, and eleven role tutorials. Read
  [references/destiny-admin.md](references/destiny-admin.md) before filming anything in the admin.
- **The Destiny One app:** `capture/destiny-one.cjs` films its Expo web build at phone size, with
  `capture/destiny-one-sample-data.cjs` answering its API. It's used for the campaign films, which
  draw the iPhone frame in the video (`DestinyOneFilm.tsx`).

For anything else (the public website, D1 Admin, a new app), follow the method above and reuse
those pieces rather than starting again.
