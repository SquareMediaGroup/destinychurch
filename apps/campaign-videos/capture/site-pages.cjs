// Screenshots the refreshed website (destinychurch.vercel.app) at MacBook Pro 14" (1512x982 @2x) and
// iPhone 18 Pro (402x812 @3x: its 874pt screen less the 62pt status bar) sizes, matching Apple's bezels, plus full-page captures. Usage: node capture/site-pages.cjs <outDir>
// Run from the repo root so require('playwright') resolves to the preinstalled copy.
const { chromium } = require('playwright');
const out = process.argv[2];
const pages = process.env.ONLY ? JSON.parse(process.env.ONLY) : [
  ['home','/'],['sermons','/sermons'],['whatson','/whats-on'],['visit','/visit'],['give','/give'],
  ['shop','/shop'],['kids','/kids'],['youth','/youth'],['connect','/connect'],['about','/about'],
  ['accessibility','/accessibility'],['governance','/governance'],['links','/links'],['nfc','/nfc'],
  ['help','/help'],['songs','/song-requests'],['talent','/talent-show'],['training','/training'],['youngadults','/young-adults'],['newhere','/new-here'],['alpha','/alpha'],['serve','/serve'],
];
(async () => {
  const b = await chromium.launch();
  for (const [vw, vh, dpr, suffix, mobile] of [[1512, 982, 2, '', false], [402, 812, 3, '-m', true]]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
    // pre-accept cookie consent if site uses localStorage/cookie; we'll also try clicking
    const p = await ctx.newPage();
    for (const [name, path] of pages) {
      try {
        await p.goto('https://destinychurch.vercel.app' + path, { waitUntil: 'networkidle', timeout: 45000 });
      } catch (e) { console.log('timeout', name); }
      const btn = p.getByRole('button', { name: /accept all cookies/i });
      if (await btn.count().catch(() => 0)) { await btn.first().click().catch(() => {}); await p.waitForTimeout(800); }
      await p.waitForTimeout(2500);
      await p.screenshot({ path: `${out}/${name}${suffix}.png` });
      // tall version for scrolling shots
      // Scroll through first so sections that fade in on scroll have appeared, then go back to the top.
      await p.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); }
        window.scrollTo(0, 0);
      }).catch(() => {});
      await p.waitForTimeout(1500);
      await p.screenshot({ path: `${out}/${name}${suffix}-full.png`, fullPage: true }).catch(()=>{});
      console.log('ok', name + suffix);
    }
    await ctx.close();
  }
  await b.close();
})();
