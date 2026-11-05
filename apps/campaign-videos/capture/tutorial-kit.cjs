// The shared machinery behind the admin help tutorials (capture/*-tutorial.cjs).
//
// A tutorial script calls film({ id, roles }, async (t) => { ... }) and, inside, drives the real
// /admin with t.step(...) and t.look(...). Each step saves a screenshot before and after its action,
// plus where the cursor goes; src/Tutorial.tsx animates them with a cursor, clicks and camera moves.
//
// Setup, the same for every tutorial:
// 1. SEED=capture/<seed>.cjs ROLES_FILE=<file> node capture/admin-mock-supabase.cjs
//    (restart it before each run: a run changes the data it starts from)
// 2. In a website checkout, with next.config.ts images allowing http://localhost:54399
//    and `dangerouslyAllowLocalIP: true` (local-only, never
//    commit that), on port 80:
//    NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=demo
//    SUPABASE_SECRET_KEY=demo npx next dev -p 80
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

// The local copy of the site runs on port 80, and just before each screenshot the visible text
// "localhost" becomes "destinytees.uk", so addresses on screen (share links, "go to …") read as the
// church's own. (Pointing destinytees.uk itself at the local copy stops the admin's scripts running.)
const BASE = process.env.BASE || 'http://localhost';
const VW = 1600, VH = 900, DSF = 1.6;
const PHOTOS = path.join(__dirname, 'shop-photos');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');

/** A browser signed in to /admin as the stand-in admin, at the tutorial viewport. */
async function openAdmin({ scale = DSF } = {}) {
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u-admin', exp, aal: 'aal2', role: 'authenticated' })}.sig`;
  const session = { access_token: jwt, refresh_token: 'r', expires_in: 86400, expires_at: exp, token_type: 'bearer', user: { id: 'u-admin', email: 'sam.taylor@example.com' } };

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: scale, acceptDownloads: true });
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
  // Vercel's analytics and speed insights: filming shouldn't count as visits.
  await ctx.route(/va\.vercel-scripts\.com|vitals\.vercel-insights\.com|\/_vercel\//, (r) => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.slice(0, 160)));
  // "Leave this page?" prompts: Playwright dismisses them by default, which keeps it on the page.
  page.on('dialog', (d) => d.accept().catch(() => {}));

  return { b, ctx, page };
}

async function film({ id, roles }, script) {
  // ONLY="Part one,Part two" films just those parts, into a separate folder, for working on a script.
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map((x) => x.trim()) : null;
  const OUT = path.join(__dirname, '..', 'public', 'tutorial', ONLY ? `${id}-only` : id);
  const MANIFEST = ONLY ? path.join(OUT, 'steps.json') : path.join(__dirname, '..', 'src', 'tutorials', `${id}-steps.json`);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  if (process.env.ROLES_FILE) {
    const prev = fs.existsSync(process.env.ROLES_FILE) ? fs.readFileSync(process.env.ROLES_FILE, 'utf8').trim() : '';
    fs.writeFileSync(process.env.ROLES_FILE, roles);
    if (prev !== roles) await new Promise((r) => setTimeout(r, 16000)); // middleware caches roles for 15s
  }

  const { b, ctx, page } = await openAdmin();

  const steps = [];
  let n = 0;
  let chapter = '';

  const settle = async (ms = 900) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(ms);
  };
  const snap = async () => {
    await page.evaluate(() => {
      const fix = (v) => v.replace(/https?:\/\/localhost(:\d+)?/g, 'https://destinytees.uk').replace(/\blocalhost(:\d+)?/g, 'destinytees.uk');
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.nodeValue.includes('localhost')) n.nodeValue = fix(n.nodeValue);
      for (const el of document.querySelectorAll('input,textarea')) if (el.value && el.value.includes('localhost')) el.value = fix(el.value);
    }).catch(() => {});
    const file = `s${String(++n).padStart(3, '0')}.jpg`;
    await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 86 });
    return file;
  };
  const boxOf = async (loc) => {
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(350);
    const bb = await loc.boundingBox({ timeout: 8000 });
    return bb ? { x: bb.x / VW, y: bb.y / VH, w: bb.width / VW, h: bb.height / VH } : null;
  };

  /**
   * One step: point at `loc` (optional), screenshot, do `act`, screenshot again.
   * `zoom` punches the camera in on the target; `hold` is the least seconds to keep the result up.
   * `typing: { text, fill, select }` types `text` into `loc` in three bites first (fill: false for rich
   * text; select: true to type over the paragraph clicked).
   */
  async function step(caption, loc, act, { zoom = 1, hold = 2.2, kind = 'click', typing, wait = 0 } = {}) {
    const target = loc ? await boxOf(loc) : null;
    const before = await snap();
    const fromUrl = page.url();
    const frames = [];
    if (typing) {
      const { text, fill = true, select = false } = typing;
      const cuts = [Math.ceil(text.length / 3), Math.ceil((2 * text.length) / 3), text.length];
      if (!fill) await loc.click(select ? { clickCount: 3 } : undefined);
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
    if (wait) await page.waitForTimeout(wait);
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
    /** A part of the tutorial: its chapter name (no commas: ONLY splits on them) and its steps. */
    part: async (name, fn) => {
      if (ONLY && !ONLY.includes(name)) return;
      chapter = name;
      // Filming a part on its own: start from the dashboard rather than a blank page.
      if (page.url() === 'about:blank') await go('/admin');
      await fn();
    },
    step,
    look,
    go,
    settle,
    // Visible ones only: some pages keep a hidden copy of a control for small screens.
    btn: (name, exact = false) => page.getByRole('button', { name, exact }).locator('visible=true').first(),
    link: (name, exact = false) => page.getByRole('link', { name, exact }).locator('visible=true').first(),
    sidebar: () => page.locator('aside').first(),
    /** The input, select or text box just after a <label> reading `text`. */
    field: (text) => page.locator(`xpath=//label[normalize-space(.)=${JSON.stringify(text)}]/following::*[self::input or self::select or self::textarea][1]`).locator('visible=true').first(),
    /** The page's own content, not the header, sidebar or breadcrumbs. */
    main: () => page.locator('main').first(),
  };

  try {
    await script(t);
    fs.writeFileSync(MANIFEST, JSON.stringify({ viewport: { w: VW, h: VH, dsf: DSF }, steps }, null, 1));
    console.log(`\n${steps.length} steps, ${n} frames → ${OUT}`);
  } catch (e) {
    // Keep the last good step list; a failed run leaves its frames and a partial list beside them.
    await page.screenshot({ path: path.join(OUT, 'failed.png') }).catch(() => {});
    fs.writeFileSync(path.join(OUT, 'steps.partial.json'), JSON.stringify({ viewport: { w: VW, h: VH, dsf: DSF }, steps }, null, 1));
    console.log(`\nFAILED after ${steps.length} steps: ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    await b.close();
  }
}

module.exports = { film, openAdmin, PHOTOS, BASE };
