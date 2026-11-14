// Real Motion: films a real product for a walkthrough (or grabs stills for a promo), step by step.
//
//   const { record } = require('./record.cjs');
//   record({
//     id: 'onboarding',                       // frames → public/walkthrough/onboarding, steps → src/walkthroughs/onboarding.json
//     base: 'http://localhost:3000',          // the local copy, pointed at pretend data
//     setup: async (ctx) => { ... },          // stand-in session cookies, ctx.route() stand-in APIs, blocked analytics
//     realHost: 'app.acme.com',               // replaces "localhost" text on screen before each screenshot
//   }, async (t) => {
//     await t.part('Getting started', async () => {
//       await t.go('/dashboard');
//       await t.step('Create a project.', t.btn(/New project/), (l) => l.click(), { zoom: 1.5 });
//       await t.step('Give it a name…', t.field('Name'), null, { zoom: 1.5, typing: { text: 'Website relaunch' } });
//       await t.look('Your projects live here.', t.main(), { hold: 3 });
//     });
//   });
//
// Run with Node (Playwright installed): node capture/<id>.cjs. ONLY="Part name" films one part into
// <id>-only/ while working on it. A failed run leaves failed.png and steps.partial.json.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const DEFAULTS = { viewport: { width: 1600, height: 900 }, scale: 1.6, root: process.cwd(), framesDir: 'public/walkthrough', stepsDir: 'src/walkthroughs' };

async function record(opts, script) {
  const o = { ...DEFAULTS, ...opts };
  const { width: VW, height: VH } = o.viewport;
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map((x) => x.trim()) : null;
  const OUT = path.join(o.root, o.framesDir, ONLY ? `${o.id}-only` : o.id);
  const MANIFEST = ONLY ? path.join(OUT, 'steps.json') : path.join(o.root, o.stepsDir, `${o.id}.json`);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });

  const browser = await chromium.launch(o.launch);
  const ctx = await browser.newContext({ viewport: o.viewport, deviceScaleFactor: o.scale, locale: o.locale, timezoneId: o.timezone, ...(o.context ?? {}) });
  await ctx.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      // No blinking caret between frames.
      s.textContent = '*{caret-color:transparent!important}';
      document.head.appendChild(s);
    });
  });
  if (o.setup) await o.setup(ctx);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.slice(0, 160)));
  // "Leave this page?" prompts would otherwise stall navigation.
  page.on('dialog', (d) => d.accept().catch(() => {}));

  const steps = [];
  let n = 0;
  let chapter = '';

  const settle = async (ms = 900) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(ms);
  };
  const snap = async () => {
    if (o.realHost) {
      await page
        .evaluate((host) => {
          const fix = (v) => v.replace(/https?:\/\/localhost(:\d+)?/g, `https://${host}`).replace(/\blocalhost(:\d+)?/g, host);
          const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          for (let x = walk.nextNode(); x; x = walk.nextNode()) if (x.nodeValue.includes('localhost')) x.nodeValue = fix(x.nodeValue);
          for (const el of document.querySelectorAll('input,textarea')) if (el.value && el.value.includes('localhost')) el.value = fix(el.value);
        }, o.realHost)
        .catch(() => {});
    }
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
   * zoom: camera punch-in on the target (1 to 1.8). hold: least seconds the result stays up.
   * typing: { text, fill = true, select = false } types into `loc` in three bites first (fill: false
   * for rich text). wait: ms after acting, for slow saves.
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
    const nav = page.url().split('?')[0] !== fromUrl.split('?')[0];
    steps.push({ chapter, caption, target, kind: typing && !act ? 'type' : kind, before, frames, after, zoom, hold, nav });
    console.log(`${n} ${chapter} · ${caption}`);
  }

  /** A held screen with a caption, optionally pointing at something. Nothing is pressed. */
  async function look(caption, loc, opts = {}) {
    const target = loc ? await boxOf(loc) : null;
    const shot = await snap();
    steps.push({ chapter, caption, target, kind: loc ? 'point' : 'none', before: shot, frames: [], after: shot, zoom: opts.zoom ?? 1, hold: opts.hold ?? 3, nav: false });
    console.log(`${n} ${chapter} · ${caption}`);
  }

  const go = async (p) => {
    await page.goto(o.base + p, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => {});
    await settle(1200);
  };

  /** A full-page still for a promo scene (no step recorded): t.still('promo/app.png', '/dashboard'). */
  const still = async (file, p, { fullPage = false } = {}) => {
    if (p) await go(p);
    const dest = path.join(o.root, 'public', file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    await page.screenshot({ path: dest, fullPage });
    console.log(`still → ${dest}`);
  };

  const t = {
    page,
    ctx,
    base: o.base,
    /** A chapter. No commas in the name: ONLY splits on them. */
    part: async (name, fn) => {
      if (ONLY && !ONLY.includes(name)) return;
      chapter = name;
      if (page.url() === 'about:blank' && o.start) await go(o.start);
      await fn();
    },
    step,
    look,
    go,
    settle,
    still,
    // Visible ones only: responsive apps keep hidden duplicates of controls.
    btn: (name, exact = false) => page.getByRole('button', { name, exact }).locator('visible=true').first(),
    link: (name, exact = false) => page.getByRole('link', { name, exact }).locator('visible=true').first(),
    /** The input, select or textarea just after a <label> reading `text`. */
    field: (text) => page.locator(`xpath=//label[normalize-space(.)=${JSON.stringify(text)}]/following::*[self::input or self::select or self::textarea][1]`).locator('visible=true').first(),
    main: () => page.locator('main').first(),
    /** The topmost open dialog, so two "Save" buttons don't collide. */
    dialog: () => page.getByRole('dialog').locator('visible=true').last(),
  };

  try {
    await script(t);
    if (steps.length) fs.writeFileSync(MANIFEST, JSON.stringify({ viewport: { w: VW, h: VH, dsf: o.scale }, steps }, null, 1));
    console.log(`\n${steps.length} steps, ${n} frames → ${OUT}`);
  } catch (e) {
    await page.screenshot({ path: path.join(OUT, 'failed.png') }).catch(() => {});
    fs.writeFileSync(path.join(OUT, 'steps.partial.json'), JSON.stringify({ viewport: { w: VW, h: VH, dsf: o.scale }, steps }, null, 1));
    console.log(`\nFAILED after ${steps.length} steps: ${e.message.split('\n')[0]}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

module.exports = { record };
