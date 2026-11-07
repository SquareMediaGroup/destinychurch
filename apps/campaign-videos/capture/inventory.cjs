// Lists what's on admin pages, to plan a tutorial: headings, buttons, fields and links in the page's
// own content, plus a small screenshot of each. Same setup as capture/tutorial-kit.cjs.
// ROLES_FILE=<file> node capture/inventory.cjs <roles> <outDir> /admin/page /admin/other ...
const fs = require('fs');
const path = require('path');
const { openAdmin, BASE } = require('./tutorial-kit.cjs');

(async () => {
  const [roles, out, ...paths] = process.argv.slice(2);
  fs.mkdirSync(out, { recursive: true });
  if (process.env.ROLES_FILE) {
    const prev = fs.existsSync(process.env.ROLES_FILE) ? fs.readFileSync(process.env.ROLES_FILE, 'utf8').trim() : '';
    fs.writeFileSync(process.env.ROLES_FILE, roles);
    if (prev !== roles) await new Promise((r) => setTimeout(r, 16000));
  }
  const { b, page } = await openAdmin({ scale: 1 });
  for (const p of paths) {
    await page.goto(BASE + p, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const info = await page.evaluate(() => {
      const main = document.querySelector('main') || document.body;
      const vis = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const txt = (el) => (el.getAttribute('aria-label') || el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      const pick = (sel) => [...new Set([...main.querySelectorAll(sel)].filter(vis).map(txt).filter(Boolean))];
      return {
        url: location.pathname,
        headings: pick('h1,h2,h3'),
        buttons: pick('button,[role=button]'),
        fields: [...main.querySelectorAll('input,textarea,select,[contenteditable=true]')].filter(vis).map((el) => `${el.tagName.toLowerCase()}${el.type ? ':' + el.type : ''} ${el.getAttribute('aria-label') || el.placeholder || el.name || (el.labels && el.labels[0] ? el.labels[0].innerText : '')}`.trim().slice(0, 70)),
        links: pick('a').slice(0, 25),
      };
    });
    const name = p.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root';
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
    console.log(`\n### ${p} → ${info.url}`);
    for (const k of ['headings', 'buttons', 'fields', 'links']) console.log(`${k}: ${info[k].join(' | ')}`);
  }
  await b.close();
})();
