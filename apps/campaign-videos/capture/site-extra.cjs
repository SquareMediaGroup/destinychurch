// Before/after pairs (the old WordPress site at destinytees.uk and the old shop at shop.destinytees.uk
// against the refreshed site), the new shop through to checkout, and Smart Search typing frames.
// Usage (from the repo root): node apps/campaign-videos/capture/site-extra.cjs <outDir>
const { chromium } = require('playwright');
const out = process.argv[2];
const NEW = 'https://destinychurch.vercel.app';
const DESKTOP = { viewport: { width: 1512, height: 982 }, deviceScaleFactor: 2 };
const PHONE = { viewport: { width: 402, height: 812 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

async function settle(p) {
  const c = p.getByRole('button', { name: /accept all cookies/i });
  if (await c.count().catch(() => 0)) await c.first().click().catch(() => {});
  await p.waitForTimeout(2500);
}

async function shoot(b, device, name, url, { full = false } = {}) {
  const ctx = await b.newContext(device);
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await settle(p);
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: full });
  console.log('ok', name);
  await ctx.close();
}

(async () => {
  const b = await chromium.launch();
  const pairs = [
    ['home', '/', '/'],
    ['visit', '/visit/', '/visit'],
    ['whatson', '/whats-on/', '/whats-on'],
    ['give', '/give/', '/give'],
    ['alpha', '/alpha/', '/alpha'],
  ];
  for (const [name, oldPath, newPath] of pairs) {
    await shoot(b, DESKTOP, `old-${name}`, `https://destinytees.uk${oldPath}`);
    await shoot(b, DESKTOP, `new-${name}`, `${NEW}${newPath}`);
  }
  await shoot(b, PHONE, 'old-home-m', 'https://destinytees.uk/');
  await shoot(b, PHONE, 'new-home-m', `${NEW}/`);
  await shoot(b, DESKTOP, 'old-shop', 'https://shop.destinytees.uk/');
  await shoot(b, DESKTOP, 'old-shop-full', 'https://shop.destinytees.uk/', { full: true });
  await shoot(b, DESKTOP, 'shop-full', `${NEW}/shop`, { full: true });

  // New shop: product page, add to basket, checkout (Stripe Payment Element on the page).
  for (const [device, sfx] of [[DESKTOP, ''], [PHONE, '-m']]) {
    const ctx = await b.newContext(device);
    const p = await ctx.newPage();
    await p.goto(`${NEW}/shop/living-in-the-overflow-t-shirt`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await settle(p);
    await p.screenshot({ path: `${out}/shop-product${sfx}.png` });
    const size = p.getByRole('button', { name: /^(M|Medium)$/ }).first();
    if (await size.count().catch(() => 0)) await size.click().catch(() => {});
    await p.getByRole('button', { name: /add to (basket|bag|cart)/i }).first().click().catch(() => {});
    await p.waitForTimeout(1500);
    await p.goto(`${NEW}/shop/checkout`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await p.waitForTimeout(6000);
    await p.screenshot({ path: `${out}/shop-checkout${sfx}.png` });
    await p.screenshot({ path: `${out}/shop-checkout${sfx}-full.png`, fullPage: true });
    console.log('ok checkout', sfx);
    await ctx.close();
  }

  // Smart Search: the question typed a few letters at a time, then the answer as it streams in.
  for (const [device, sfx, q] of [
    [DESKTOP, '', 'Is there something for my kids on Sunday?'],
    [PHONE, '-m', 'How do I get baptised?'],
  ]) {
    const ctx = await b.newContext(device);
    const p = await ctx.newPage();
    await p.goto(`${NEW}/`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await settle(p);
    await p.getByRole('button', { name: 'Open Smart Search' }).first().click();
    await p.waitForTimeout(1200);
    const input = p.locator('input[placeholder]').last();
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      await input.fill(q.slice(0, Math.round((q.length * i) / steps)));
      await p.waitForTimeout(150);
      await p.screenshot({ path: `${out}/ss${sfx}-type-${i}.png` });
    }
    await input.press('Enter');
    for (let i = 1; i <= 8; i++) {
      await p.waitForTimeout(1400);
      await p.screenshot({ path: `${out}/ss${sfx}-answer-${i}.png` });
    }
    console.log('ok search', sfx);
    await ctx.close();
  }
  await b.close();
})();
