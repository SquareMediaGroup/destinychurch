// The old site (destinytees.uk, for the before/after scene) and the refreshed site at
// iPhone Duo sizes: inner display 626x890pt and outer 466x678pt, both @3x
// (Apple's specs: 1878x2670 and 1398x2034 pixels). Usage: node capture/site-extra.cjs <outDir>
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const shots = [
    ['old-home', 'https://destinytees.uk/', 1440, 900, 2, false],
    ['duo-home', 'https://destinychurch.vercel.app/', 626, 890, 3, true],
    ['duo-sermons', 'https://destinychurch.vercel.app/sermons', 626, 890, 3, true],
    ['duo-outer-home', 'https://destinychurch.vercel.app/', 466, 678, 3, true],
  ];
  for (const [name, url, w, h, dpr, mobile] of shots) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    const c = p.getByRole('button', { name: /accept all cookies/i });
    if (await c.count().catch(() => 0)) await c.first().click().catch(() => {});
    await p.waitForTimeout(3000);
    await p.screenshot({ path: `${out}/${name}.png` });
    console.log('ok', name);
    await ctx.close();
  }
  await b.close();
})();
