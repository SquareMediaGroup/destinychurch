# Real Motion: capturing the real product

The film shows the actual interface. The data in it is invented, and nothing real is changed or
contacted.

## 1. A safe copy to film

Run the product locally (or a preview build), pointed at pretend data. Choose the lightest option
that works:

| Option | When | How |
| --- | --- | --- |
| **Stand-in API in the browser** | Few endpoints, or the backend is hard to fake | In `setup(ctx)`, `ctx.route('**/api/**', handler)` answers the app's calls from a small stateful JS store shaped like the real responses (read the types in the code). Writes update the store, so the next screen shows the change. |
| **Stand-in backend** | The app's own server routes should run unchanged | Point the app's database or service URL (Supabase, REST, GraphQL) at a small local server seeded with invented rows. |
| **Seeded test database** | A local or branch database exists | Load invented seed data. Never point at production. |

- **Third-party services:** leave payment, email, AI and analytics keys unset. Answer the few
  calls the film needs in `ctx.route`, block analytics, and explain anything else in a caption
  rather than pressing it.
- **Sign-in:** in `setup`, add the session cookie or local storage token the app accepts locally,
  for a pretend user with exactly the permissions the film is about. For example, a JWT-shaped
  token with the claims the middleware reads.
- **Seed data:**
  - enough rows that lists, filters and counts look real
  - dates near today
  - each state present (draft, live, done, error) so every badge appears
  - invented names and `@example.com` emails
  - public content the company already publishes (its products, its photos) is fine.
- **Warm up:** load each page once before filming. First dev-mode compiles are slow.
- **Fix what breaks:** a page that errors usually wants a missing column, relation or server
  function in the pretend data.

## 2. Recording

`capture/record.cjs` (copied from this skill's assets):

```js
const { record } = require('./record.cjs');
record({
  id: 'onboarding',
  base: 'http://localhost:3000',
  start: '/dashboard',             // where a part filmed on its own begins
  realHost: 'app.acme.com',        // on-screen "localhost" becomes this
  locale: 'en-GB', timezone: 'Europe/London',
  setup: async (ctx) => {
    await ctx.addCookies([{ name: 'session', value: '…', url: 'http://localhost:3000' }]);
    await ctx.route(/analytics|vitals/, (r) => r.abort());
  },
}, async (t) => {
  await t.part('Getting started', async () => {
    await t.go('/dashboard');
    await t.step('Create your first board.', t.btn(/New board/), (l) => l.click(), { zoom: 1.5 });
    await t.step('Name it…', t.field('Board name'), null, { zoom: 1.6, typing: { text: 'Website relaunch' } });
    await t.step('…and create it.', t.dialog().getByRole('button', { name: 'Create' }), (l) => l.click(), { zoom: 1.5, hold: 2.6 });
    await t.look('Your boards live here.', t.main(), { hold: 3 });
  });
});
```

| Call | What it does |
| --- | --- |
| `step(caption, locator, action, opts)` | Points at `locator`, takes a screenshot, runs the action, takes another. `action` set to null with `typing: { text }` types the text into the locator in three bites. |
| `look(caption, locator, opts)` | A held screen with a caption. Nothing is pressed. |
| `still(file, path, { fullPage })` | Saves a promo screenshot to `public/<file>`. |

Options for `step` and `look`:
- `zoom`: how far the camera punches in, from 1 to 1.8.
- `hold`: how long the result stays up, in seconds. About 2.2 for short captions, 3.5 to 4.5 for long ones.
- `wait`: milliseconds to wait after the action, for slow saves.
- `kind: 'point'`: points at the target without clicking.

Output:
- The frames go to `public/walkthrough/<id>/`.
- The steps go to `src/walkthroughs/<id>.json` as `{ viewport, steps }`.
- `ONLY="Part name"` films a single part into `<id>-only/`.
- A failed run leaves `failed.png` and `steps.partial.json` behind.

**Phones:** use the product's web build (Expo, React Native Web, Flutter web) at a phone viewport:

```js
context: { viewport: { width: 402, height: 874 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
```

Show it in `PhoneFrame`. Draw native-only parts in the video.

## 3. Finding elements

These lessons come from filming eleven tutorials:

- **Icon text:** accessible names often include icon text. Match with a regex (`/^Save/`) or by visible text.
- **Non-buttons:** switches, radios, chips and tabs are often not buttons. Use `getByLabel`, `getByText` or the label's text.
- **Hidden duplicates:** responsive apps keep hidden copies of controls. `t.btn`, `t.link` and `t.field` take the visible one; elsewhere add `.locator('visible=true')`.
- **Two "Save" buttons:** scope lookups to the topmost dialog (`t.dialog()`) or the app's modal container.
- **Collapsed menus:** open the group before clicking its link.
- **Prompts:** "Leave this page?" prompts are accepted automatically.
- **Slow saves:** pass `wait`, so the after-screenshot shows the saved state, not a spinner.
- **Date fields:** headless Chromium may show them as mm/dd/yyyy whatever the locale. That's a known limit.

## 4. Checking

```bash
python3 capture/contact-sheet.py src/walkthroughs/<id>.json public/walkthrough/<id> sheet-0.png 0
python3 capture/contact-sheet.py src/walkthroughs/<id>.json public/walkthrough/<id> sheet-30.png 30
```

Read every sheet. Look for:
- red boxes in the wrong place (they matched a hidden or duplicate element)
- empty lists, error messages, spinners
- pop-ups that should have closed
- captions that don't match the screen

Open single frames at full size where in doubt. Filming is fast and rendering is slow, so fix
problems here.

## 5. Captions tell the truth

Before writing a caption, read the code behind the control. Say what it does, and what it doesn't
if people might assume otherwise (for example: "Mark refunded only changes the status. No money
moves."). Use the interface's own labels and the user's spelling conventions. A caption can be
fixed later in the step list without re-filming.

## 6. Re-filming

When the interface changes:

1. Edit the script and the pretend data.
2. Film the changed part alone (`ONLY`) to check it.
3. Film the whole video, check the sheets and re-render.
4. Update the poster, length and thumbnail.

A re-uploaded video gets a new ID, so update every place that embeds it.
