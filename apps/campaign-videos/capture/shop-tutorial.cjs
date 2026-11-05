// Films the Store Admin tutorial: drives the real /admin store pages through everything a Store
// Admin can do, against the pretend shop in capture/admin-mock-supabase.cjs, and writes a
// screenshot before and after every action plus where the cursor goes.
//
// 1. SEED=capture/shop-seed.cjs ROLES_FILE=<file> node capture/admin-mock-supabase.cjs
//    (restart it before each run: the run creates products, so a second run starts from a
//    different shop)
// 2. In a website checkout, with next.config.ts images allowing http://localhost:54399 and
//    `dangerouslyAllowLocalIP: true` (local-only, never commit that):
//    NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=demo
//    SUPABASE_SECRET_KEY=demo npx next dev -p 3100
// 3. ROLES_FILE=<same file> node capture/shop-tutorial.cjs
//    → public/tutorial/shop/*.jpg (gitignored) and src/tutorials/shop-steps.json (committed)
//
// The admin is "Sam Taylor", a Store Admin. The session is a stand-in that says it has passed
// two-factor sign-in (aal2), which is all middleware reads from the token.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:3100';
const OUT = path.join(__dirname, '..', 'public', 'tutorial', 'shop');
const MANIFEST = path.join(__dirname, '..', 'src', 'tutorials', 'shop-steps.json');
const PHOTOS = path.join(__dirname, 'shop-photos');
const VW = 1600, VH = 900, DSF = 1.6;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 86400;
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u-admin', exp, aal: 'aal2', role: 'authenticated' })}.sig`;
const session = { access_token: jwt, refresh_token: 'r', expires_in: 86400, expires_at: exp, token_type: 'bearer', user: { id: 'u-admin', email: 'sam.taylor@example.com' } };

const steps = [];
let n = 0;
let chapter = '';
let page;

async function settle(ms = 900) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}
async function snap() {
  const file = `s${String(++n).padStart(3, '0')}.jpg`;
  await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 86 });
  return file;
}
async function boxOf(loc) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(350);
  const b = await loc.boundingBox();
  return b ? { x: b.x / VW, y: b.y / VH, w: b.width / VW, h: b.height / VH } : null;
}

/**
 * One step: point at `loc` (optional), screenshot, do `act`, screenshot again.
 * `zoom` punches the camera in on the target; `hold` is seconds to keep the result on screen.
 */
async function step(caption, loc, act, { zoom = 1, hold = 2.2, kind = 'click', typing } = {}) {
  const target = loc ? await boxOf(loc) : null;
  const before = await snap();
  const fromUrl = page.url();
  const frames = [];
  if (typing) {
    // Type in a few bites so the text visibly appears.
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
  steps.push({ chapter, caption, target, kind, before, frames, after, zoom, hold, nav });
  console.log(`${n} ${chapter} · ${caption}`);
}
/** A step with nothing to click: the screen as it is, with a caption (optionally pointing at something). */
async function look(caption, loc, opts = {}) {
  const target = loc ? await boxOf(loc) : null;
  const shot = await snap();
  steps.push({ chapter, caption, target, kind: loc ? 'point' : 'none', before: shot, frames: [], after: shot, zoom: opts.zoom ?? 1, hold: opts.hold ?? 3, nav: false });
  console.log(`${n} ${chapter} · ${caption}`);
}
const go = async (p) => { await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => {}); await settle(1200); };
const btn = (name, exact = false) => page.getByRole('button', { name, exact }).first();
const link = (name, exact = false) => page.getByRole('link', { name, exact }).first();
const sidebar = () => page.locator('aside').first();
const variantsAdd = () => page.locator('section').filter({ hasText: 'What kind of product is this?' }).getByRole('button', { name: 'Add', exact: true }).first();

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  if (process.env.ROLES_FILE) fs.writeFileSync(process.env.ROLES_FILE, 'store_admin');

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
  page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message.slice(0, 160)));

  // ── 1. Finding your way ──────────────────────────────────────────────────
  chapter = 'Finding your way';
  await go('/admin');
  await look('Signed in as a Store Admin, the dashboard shows the shop at a glance.', null, { hold: 3.2 });
  await look('Paid orders waiting to be handed over are listed first, so nothing gets missed.', page.getByText(/paid order/i).first(), { zoom: 1.5 });
  await look('Everything for the shop lives under Store in the sidebar.', sidebar().getByText('Store', { exact: true }).first(), { zoom: 1.6 });
  await step('Open Store to see Products, Orders and Store Hero.', sidebar().getByText('Store', { exact: true }).first(), (l) => l.click(), { zoom: 1.6 });

  // ── 2. The product list ──────────────────────────────────────────────────
  chapter = 'Your products';
  await step('Products lists everything in the shop.', sidebar().getByRole('link', { name: 'Products', exact: true }), (l) => l.click());
  await look('Each row shows the price, how many variants, the stock left and the category.', page.locator('main ul li').first(), { zoom: 1.5 });
  await look('Badges tell you what’s live. Draft products are hidden from the shop.', page.getByText('Draft', { exact: true }).last(), { zoom: 1.7 });
  await look('Low means three or fewer left. Red stock means sold out.', page.getByText('Low', { exact: true }).last(), { zoom: 1.7 });
  const search = page.getByPlaceholder('Search name, category or SKU');
  await step('Search by name, category or SKU.', search, null, { zoom: 1.6, kind: 'type', typing: { text: 'hoodie' } });
  await step('Clear the search to see everything again.', search, (l) => l.fill(''), { zoom: 1.6, hold: 1.4 });
  await step('Filter to what needs attention. Low stock…', btn(/^Low stock/), (l) => l.click(), { zoom: 1.4 });
  await step('…or Sold out, so you know what to reorder.', btn(/^Sold out/), (l) => l.click(), { zoom: 1.4 });
  await step('Drafts shows products that aren’t on the shop yet.', btn(/^Draft/), (l) => l.click(), { zoom: 1.4 });
  await step('All brings the full list back.', btn(/^All/), async (l) => { await btn(/^Sold out/).click(); await l.click(); }, { zoom: 1.4, hold: 1.6 });

  // ── 3. Add a product ─────────────────────────────────────────────────────
  chapter = 'Add a product';
  await step('To add something new, choose New product.', link('New product'), (l) => l.click(), { zoom: 1.5 });
  const nameInput = page.getByPlaceholder('e.g. Destiny Logo Tee');
  await step('Give it a name to start.', nameInput, null, { zoom: 1.5, kind: 'type', typing: { text: 'Transformation Hoodie' } });
  await step('Create & continue opens the full editor.', btn('Create & continue'), (l) => l.click(), { zoom: 1.5, hold: 2.6 });
  await look('The editor has three parts: Details, Photos and Variants.', null, { hold: 3 });
  await look('The slug is made from the name. It’s the product’s web address: /shop/transformation-hoodie.', page.getByText('Used in the URL').first(), { zoom: 1.6 });
  const category = page.getByPlaceholder('e.g. T-Shirts');
  await step('Category groups products on the shop. Use one that already exists, like Jumper.', category, null, { zoom: 1.6, kind: 'type', typing: { text: 'Jumper' } });
  const editor = page.locator('.ProseMirror').first();
  await step('Write the description. The toolbar does bold, lists and links.', editor, null, { zoom: 1.4, kind: 'type', typing: { text: 'Wherever the river flows, transformation follows. A heavyweight hoodie with the Ezekiel 47 artwork on the front. Collect at church.', fill: false } });
  const price = page.locator('input[inputmode="decimal"]').first();
  await step('Set the base price in pounds. Every variant uses it.', price, null, { zoom: 1.7, kind: 'type', typing: { text: '35.00' } });
  const sortInput = page.locator('input[type="number"]').first();
  await step('Sort order sets where it sits on the shop. Lower numbers come first.', sortInput, null, { zoom: 1.7, kind: 'type', typing: { text: '2' } });

  // ── 4. Photos ────────────────────────────────────────────────────────────
  chapter = 'Photos';
  const addPhoto = page.locator('section').filter({ hasText: 'First photo is the main image' }).getByRole('button', { name: 'Add', exact: true });
  const fileInput = page.locator('input[type="file"]').first();
  await step('Add photos. Pick one or several at once. They’re turned into small, fast WebP files for you.', addPhoto, async () => {
    await fileInput.setInputFiles([path.join(PHOTOS, 'river-hoodie.webp'), path.join(PHOTOS, 'tent-hoodie.webp')]);
    await page.waitForTimeout(2500);
  }, { zoom: 1.4, hold: 2.6 });
  await look('The first photo is the main one, shown on the shop and in the product list.', page.locator('img[alt=""]').first(), { zoom: 1.6 });
  const second = page.locator('section').filter({ hasText: 'Photos' }).locator('div.group').nth(1);
  await step('Wrong photo? Hover it and press the cross to remove it.', second.getByLabel('Remove image'), async (l) => { await second.hover(); await page.waitForTimeout(200); await l.click(); }, { zoom: 1.6 });

  // ── 5. Variants and stock ────────────────────────────────────────────────
  chapter = 'Variants and stock';
  await look('Variants are the versions people choose between: colours and sizes, or formats for books.', page.getByText('What kind of product is this?'), { zoom: 1.3, hold: 3.2 });
  await step('Who is it for? Kids switches to age-based sizes…', btn('Kids', true), (l) => l.click(), { zoom: 1.5 });
  await step('…this one is Unisex, adult sizes XS to 3XL.', btn('Unisex', true), (l) => l.click(), { zoom: 1.5, hold: 1.6 });
  await step('Add colours with one click from Quick add…', btn('Black', true), (l) => l.click(), { zoom: 1.5 });
  const swatch = page.getByLabel('Colour swatch');
  await step('…or make your own: pick the shade, name it, and press Add.', page.getByPlaceholder('Colour name (e.g. Charcoal)'), async (l) => {
    await swatch.fill('#c9b28d');
    await l.fill('Stone');
    await page.waitForTimeout(250);
    await variantsAdd().click();
  }, { zoom: 1.5, hold: 2.4 });
  const sizes = ['S', 'M', 'L', 'XL', '2XL'];
  await step('Pick the sizes you stock. They apply to every colour.', btn('S', true), async () => {
    for (const s of sizes) { await btn(s, true).click(); await page.waitForTimeout(120); }
  }, { zoom: 1.4, hold: 2.4 });
  const table = page.locator('table').first();
  await look('That builds the stock grid: one box per colour and size.', table, { zoom: 1.4, hold: 3 });
  const dflt = page.getByLabel('Default stock').first();
  await step('Set a number and press Apply to all to fill every box at once.', dflt, async () => {
    await dflt.fill('12');
    await page.waitForTimeout(200);
    await btn(/Apply to all/).click();
  }, { zoom: 1.6, kind: 'type' });
  const cell = (row, col) => table.locator('tbody tr').nth(row).locator('td').nth(col);
  await step('Then fine-tune any box. We have 20 black mediums.', cell(0, 1).locator('input'), (l) => l.fill('20'), { zoom: 1.8 });
  await step('0 turns a box red: sold out, but still listed so people can see it.', cell(1, 4).locator('input'), (l) => l.fill('0'), { zoom: 1.8 });
  await step('Not making one at all, like Stone in small? Hover the box and press the cross.', cell(1, 0).getByTitle('Remove this combination'), async (l) => { await cell(1, 0).locator('div.group').hover(); await page.waitForTimeout(200); await l.click(); }, { zoom: 1.8 });
  await look('The badge counts the variants this product will sell.', page.getByText(/\d+ variants/).first(), { zoom: 1.8 });

  // ── 6. Publish and save ──────────────────────────────────────────────────
  chapter = 'Publish and save';
  await step('Turn on Published to put it on the shop.', btn('Published', true), (l) => l.click(), { zoom: 1.8 });
  await step('Featured puts it in the spotlight at the top of the shop.', btn('Featured', true), (l) => l.click(), { zoom: 1.8 });
  await step('Nothing is kept until you press Save.', btn('Save', true), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
  await step('View opens the product on the live shop.', page.locator('main').getByRole('link', { name: 'View', exact: true }), async (l) => {
    const href = await l.getAttribute('href');
    await go(href);
  }, { zoom: 1.6, hold: 1.2 });
  await look('There it is, with its photos, sizes and price, ready to buy.', null, { hold: 3.4 });
  await step('Sizes that are sold out, or that you don’t make, are crossed out, so nobody can order them.', page.getByRole('button', { name: 'Stone', exact: true }), (l) => l.click(), { zoom: 1.7, hold: 3.2 });

  // ── 7. Books and other products ──────────────────────────────────────────
  chapter = 'Books and other products';
  await go('/admin/store');
  await step('Books work the same way, with formats instead of sizes.', page.getByRole('link', { name: /The Life Recovery Bible/ }), (l) => l.click(), { zoom: 1.4 });
  await page.locator('section').filter({ hasText: 'Variants' }).first().scrollIntoViewIfNeeded();
  await look('Pick the formats you sell: paperback, hardcover, eBook and more.', page.getByText('Formats', { exact: true }), { zoom: 1.4 });
  const custom = page.getByPlaceholder('Custom format (e.g. Signed Edition)');
  await step('Something else? Type your own format and press Add.', custom, async (l) => {
    await l.fill('Gift Edition');
    await page.waitForTimeout(250);
    await variantsAdd().click();
  }, { zoom: 1.5 });
  // Formats sit in one row of the stock grid; the new one is the last box.
  const giftBox = page.locator('table tbody tr').first().locator('td').last().locator('input');
  await step('Then give it some stock, and save.', giftBox, async (l) => { await l.fill('4'); await btn('Save', true).click(); }, { zoom: 1.7, hold: 2.4 });
  await step('Other is for anything else, like a bundle or a ticket, with variants you name yourself.', btn('Other', true), (l) => l.click(), { zoom: 1.4, hold: 2.8 });
  await btn('Books', true).click(); await settle(400);

  // ── 8. Many products at once ─────────────────────────────────────────────
  chapter = 'Many products at once';
  await go('/admin/store');
  await step('Tick products to work on several at once.', page.getByLabel('Select Deep Strokes, Wide Reach Tee'), (l) => l.check(), { zoom: 1.6 });
  await look('Publish or unpublish them together, export them as a spreadsheet, or delete them.', page.getByText(/1 product selected|selected/).first(), { zoom: 1.4, hold: 3.2 });
  await step('Publish puts this draft on the shop.', btn('Publish', true), (l) => l.click(), { zoom: 1.5 });
  await step('Deleting asks first, and it can’t be undone. Unpublish instead if you might bring it back.', page.getByLabel('Select Deep Strokes, Wide Reach Tee'), async (l) => {
    await l.check();
    await page.waitForTimeout(200);
    await btn('Delete', true).click();
    await page.waitForTimeout(500);
  }, { zoom: 1.4, hold: 3 });
  await step('Here we’ll keep it. Cancel.', page.getByRole('dialog').getByRole('button', { name: 'Cancel' }), async (l) => { await l.click(); await page.waitForTimeout(300); await btn('Clear', true).click().catch(() => {}); }, { zoom: 1.4, hold: 1.6 });

  // ── 9. Orders ────────────────────────────────────────────────────────────
  chapter = 'Orders';
  await step('Orders is where purchases arrive.', sidebar().getByRole('link', { name: 'Orders', exact: true }), (l) => l.click());
  await look('Each order shows its number, the customer, the date, the total and its status.', page.locator('main ul li').first(), { zoom: 1.4, hold: 3.2 });
  await look('Paid means the money has arrived and it’s waiting for collection at church.', page.getByText('Paid', { exact: true }).last(), { zoom: 1.6 });
  const osearch = page.getByPlaceholder('Search order number, name or email');
  await step('Find an order by its number, the customer’s name or their email.', osearch, null, { zoom: 1.5, kind: 'type', typing: { text: 'amara' } });
  await step('Open it to see everything about it.', page.getByRole('link', { name: /Amara Okafor/ }), (l) => l.click(), { zoom: 1.3 });
  await look('Who ordered, how to reach them, and any note they left.', page.getByText('Customer', { exact: true }), { zoom: 1.5, hold: 3.2 });
  await look('What they bought, in which colour and size, and the total.', page.getByText(/Items · collection at church/), { zoom: 1.5, hold: 3 });
  await step('When they collect it, press Mark fulfilled.', btn(/Mark fulfilled/), (l) => l.click(), { zoom: 1.6, hold: 2.6 });
  await look('Cancel order and Mark refunded change the status only. Give the money back in Stripe, and add any stock back on the product.', btn(/Mark refunded/), { zoom: 1.5, hold: 4.4 });
  await step('Back to all orders.', page.locator('main').getByRole('link', { name: 'Orders', exact: true }).last(), (l) => l.click(), { zoom: 1.4, hold: 1.4 });
  await step('Filter by status. Paid shows everything still to hand over.', btn(/^Paid/), (l) => l.click(), { zoom: 1.4 });
  await look('The total of paid and fulfilled orders in view is shown above the list.', page.getByText(/Paid and fulfilled in this view/), { zoom: 1.6 });
  await step('Tick several to fulfil them together after a Sunday.', page.getByLabel('Select all shown').first(), (l) => l.check(), { zoom: 1.5 });
  await step('Mark fulfilled, all at once. They leave the Paid list.', btn('Mark fulfilled', true), (l) => l.click(), { zoom: 1.5, hold: 2.4 });
  await step('Export all downloads the orders in view as a spreadsheet, for the finance team.', btn(/Export/), async (l) => { await btn(/^All/).click(); await settle(300); await l.click(); }, { zoom: 1.5, hold: 2.6 });

  // ── 10. The shop's hero ──────────────────────────────────────────────────
  chapter = 'Store Hero';
  await step('Store Hero is the big banner at the top of the shop.', sidebar().getByRole('link', { name: 'Store Hero', exact: true }), (l) => l.click(), { hold: 2.6 });
  await look('Two or more active slides rotate on their own.', page.getByText(/Two or more active slides/), { zoom: 1.5, hold: 3 });
  await step('Add slide makes a new one at the bottom.', btn('Add slide'), (l) => l.click(), { zoom: 1.5 });
  const card = page.locator('div.rounded-2xl.shadow-sm').filter({ hasText: 'Slide 2' }).first();
  await step('Upload a wide image for the background.', card.getByText('Click to upload'), async () => {
    await card.locator('input[type="file"]').setInputFiles(path.join(PHOTOS, 'hero-river.webp'));
    await page.waitForTimeout(2500);
  }, { zoom: 1.3, hold: 2.4 });
  await step('Add a heading…', card.getByPlaceholder('New drop is here'), null, { zoom: 1.6, kind: 'type', typing: { text: 'Transformation follows' } });
  await step('…a line underneath…', card.getByPlaceholder('Wear the vision — limited run, collect at church.'), null, { zoom: 1.6, kind: 'type', typing: { text: 'New hoodies and tees, collect at church on Sunday.' } });
  await step('…and a button, with the page it goes to.', card.getByPlaceholder('Shop the drop'), async () => {
    await card.getByPlaceholder('/shop/some-product').fill('/shop/transformation-hoodie');
  }, { zoom: 1.5, kind: 'type', typing: { text: 'Shop the hoodie' } });
  await step('Save slide.', card.getByRole('button', { name: /Save slide/ }), (l) => l.click(), { zoom: 1.6, hold: 2.2 });
  await step('Move it up to show it first.', card.getByLabel('Move up'), (l) => l.click(), { zoom: 1.7 });
  await look('The switch hides a slide without deleting it. The bin deletes it for good.', page.getByLabel('Delete slide').first(), { zoom: 1.7, hold: 3.4 });
  await step('And it’s live on the shop.', null, async () => { await go('/shop'); }, { hold: 3.6 });

  fs.writeFileSync(MANIFEST, JSON.stringify({ viewport: { w: VW, h: VH, dsf: DSF }, steps }, null, 1));
  console.log(`\n${steps.length} steps, ${n} frames → ${OUT}`);
  await b.close();
})();
