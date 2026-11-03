// Opens Smart Search on the website, asks a real question and captures the three states
// (open, typed, answered) used in the Smart Search scene. Usage: node capture/site-search.cjs <outDir>
const { chromium } = require('playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch();
  for (const [vw, vh, dpr, sfx, mobile] of [[1512, 982, 2, '', false], [402, 812, 3, '-m', true]]) {
    const ctx = await b.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
    const p = await ctx.newPage();
    await p.goto('https://destinychurch.vercel.app/', { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{});
    const c = p.getByRole('button', { name: /accept all cookies/i });
    if (await c.count()) await c.first().click();
    await p.waitForTimeout(1500);
    await p.getByRole('button', { name: 'Open Smart Search' }).first().click();
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${out}/search-open${sfx}.png` });
    const input = p.locator('input[placeholder]').last();
    await input.fill('What time is church on Sunday?');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/search-typed${sfx}.png` });
    await input.press('Enter');
    await p.waitForTimeout(14000);
    await p.screenshot({ path: `${out}/search-answer${sfx}.png` });
    await ctx.close();
  }
  await b.close();
})();
