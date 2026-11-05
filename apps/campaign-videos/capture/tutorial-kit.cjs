// The shared machinery behind the admin help tutorials (capture/*-tutorial.cjs).
//
// A tutorial script calls film({ id, roles }, async (t) => { ... }) and, inside, drives the real
// /admin with t.step(...) and t.look(...). Each step saves a screenshot before and after its action,
// plus where the cursor goes; src/Tutorial.tsx animates them with a cursor, clicks and camera moves.
//
// Setup, the same for every tutorial:
// 1. SEED=capture/<seed>.cjs ROLES_FILE=<file> node capture/admin-mock-supabase.cjs
//    (restart it before each run: a run changes the data it starts from)
// 2. In a website checkout, with next.config.ts images allowing http://localhost:54399 and
//    `dangerouslyAllowLocalIP: true` (local-only, never commit that):
//    NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=demo
//    SUPABASE_SECRET_KEY=demo npx next dev -p 3100
//    Leave every other key unset: with no Stripe, email, Buzzsprout or Playbook keys, nothing can
//    reach a real outside service. Where a step needs one, the script answers that request in the
//    browser instead (t.ctx.route).
// 3. ROLES_FILE=<same file> node capture/<id>-tutorial.cjs
//    → public/tutorial/<id>/*.jpg (gitignored) and src/tutorials/<id>-steps.json (committed)
//
// The admin is "Sam Taylor". The session is a stand-in that says it has passed two-factor sign-in
// (aal2), which is all middleware reads from the token.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:3100';
const VW = 1600, VH = 900, DSF = 1.6;
const PHOTOS = path.join(__dirname, 'shop-photos');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

async function film({ id, roles }, script) {
  const OUT = path.join(__dirname, '..', 'public', 'tutorial', id);
  const MANIFEST = path.join(__dirname, '..', 'src', 'tutorials', `${id}-steps.json`);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  if (process.env.ROLES_FILE) {
    const prev = fs.existsSync(process.env.ROLES_FILE) ? fs.readFileSync(process.env.ROLES_FILE, 'utf8').trim() : '';
    fs.writeFileSync(process.env.ROLES_FILE, roles);
    if (prev !== roles) await new Promise((r) => setTimeout(r, 16000)); // middleware caches roles for 15s
  }

  const exp = Math.floor(Date.now() / 1000) + 86400;
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u-admin', exp, aal: 'aal2', role: 'authenticated' })}.sig`;
  const session = { access_token: jwt, refresh_token: 'r', expires_in: 86400, expires_at: exp, token_type: 'bearer', user: { id: 'u-admin', email: 'sam.taylor@example.com' } };

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: DSF, acceptDownloads: true });
  await ctx.addCookies([{ name: 'sb-localhost-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: BASE }]);
  await ctx.addInitScript(() => {
    localStorage.setItem('destiny-cookie-consent', JSON.stringify({ essential: true, media: true, analytics: false, updatedAt: Date.now() }));
    localStorage.setItem('dc-admin-avatar-prompt-dismissed:u-admin', '1');
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      // The dev-only Next.js badge, and a caret that would blink between frames.
      s.textContent = 'nextjs-portal{display:none!important} *{caret-color:transparent!important}';
      document.head.appendChild(s);
    });
  });
  await ctx.route('**/api/admin/notifications**', (r) => r.fulfill({ json: [] }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.slice(0, 160)));

  const steps = [];
  let n = 0;
  let chapter = '';

  const settle = async (ms = 900) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(ms);
  };
  const snap = async () => {
    const file = `s${String(++n).padStart(3, '0')}.jpg`;
    await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 86 });
    return file;
  };
  const boxOf = async (loc) => {
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(350);
    const bb = await loc.boundingBox();
    return bb ? { x: bb.x / VW, y: bb.y / VH, w: bb.width / VW, h: bb.height / VH } : null;
  };

  /**
   * One step: point at `loc` (optional), screenshot, do `act`, screenshot again.
   * `zoom` punches the camera in on the target; `hold` is the least seconds to keep the result up.
   * `typing: { text, fill }` types `text` into `loc` in three bites first (fill: false for rich text).
   */
  async function step(caption, loc, act, { zoom = 1, hold = 2.2, kind = 'click', typing } = {}) {
    const target = loc ? await boxOf(loc) : null;
    const before = await snap();
    const fromUrl = page.url();
    const frames = [];
    if (typing) {
      const { text, fill = true } = typing;
      const cuts = [Math.ceil(text.length / 3), Math.ceil((2 * text.length) / 3), text.length];
      if (!fill) await loc.click();
      let prev = 0;
      for (const c of cuts) {
        if (fill) await loc.fill(text.slice(0, c));
        else await page.keyboard.type(text.slice(prev, c), { delay: 4 });
        prev = c;
        await page.waitForTimeout(150);
        frames.push(await snap());
      }
    }
    if (act) await act(loc);
    await settle();
    const after = await snap();
    // A click that opened another page: the camera pulls back out to show it.
    const nav = page.url().split('?')[0] !== fromUrl.split('?')[0];
    steps.push({ chapter, caption, target, kind: typing && !act ? 'type' : kind, before, frames, after, zoom, hold, nav });
    console.log(`${n} ${chapter} · ${caption}`);
  }
  /** Nothing to click: the screen as it is, with a caption, optionally pointing at something. */
  async function look(caption, loc, opts = {}) {
    const target = loc ? await boxOf(loc) : null;
    const shot = await snap();
    steps.push({ chapter, caption, target, kind: loc ? 'point' : 'none', before: shot, frames: [], after: shot, zoom: opts.zoom ?? 1, hold: opts.hold ?? 3, nav: false });
    console.log(`${n} ${chapter} · ${caption}`);
  }
  const go = async (p) => {
    await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => {});
    await settle(1200);
  };

  const t = {
    page,
    ctx,
    BASE,
    PHOTOS,
    chapter: (name) => (chapter = name),
    step,
    look,
    go,
    settle,
    btn: (name, exact = false) => page.getByRole('button', { name, exact }).first(),
    link: (name, exact = false) => page.getByRole('link', { name, exact }).first(),
    sidebar: () => page.locator('aside').first(),
    /** The page's own content, not the header, sidebar or breadcrumbs. */
    main: () => page.locator('main').first(),
  };

  try {
    await script(t);
    fs.writeFileSync(MANIFEST, JSON.stringify({ viewport: { w: VW, h: VH, dsf: DSF }, steps }, null, 1));
    console.log(`\n${steps.length} steps, ${n} frames → ${OUT}`);
  } catch (e) {
    // Keep the last good step list; a failed run only leaves its frames behind.
    console.log(`\nFAILED after ${steps.length} steps: ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    await b.close();
  }
}

module.exports = { film, PHOTOS };
