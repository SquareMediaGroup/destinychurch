// Screenshots the refreshed website (destinychurch.vercel.app) at desktop (1440x900 @2x) and
// phone (390x844 @3x) sizes, plus full-page captures. Usage: node capture/site-pages.cjs <outDir>
// Run from the repo root so require('playwright') resolves to the preinstalled copy.
const { chromium } = require('playwright');
const out = process.argv[2];
const pages = [
  ['home','/'],['sermons','/sermons'],['whatson','/whats-on'],['visit','/visit'],['give','/give'],
  ['shop','/shop'],['kids','/kids'],['youth','/youth'],['connect','/connect'],['about','/about'],
  ['accessibility','/accessibility'],['governance','/governance'],['links','/links'],['nfc','/nfc'],
  ['help','/help'],['songs','/song-requests'],['talent','/talent-show'],['training','/training'],['youngadults','/young-adults'],['newhere','/new-here'],['alpha','/alpha'],['serve','/serve'],
];
(async () => {
  const b = await chromium.launch();
  for (const [vw, vh, dpr, suffix, mobile] of [[1440, 900, 2, '', false], [390, 844, 3, '-m', true]]) {
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
      await p.screenshot({ path: `${out}/${name}${suffix}-full.png`, fullPage: true }).catch(()=>{});
      console.log('ok', name + suffix);
    }
    await ctx.close();
  }
  await b.close();
})();
