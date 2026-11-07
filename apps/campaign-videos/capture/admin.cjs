// Screenshots the real /admin with an invented admin and sample numbers, for the admin help videos.
// 1. node capture/admin-mock-supabase.cjs   (ROLES_FILE=<file> so this script can switch roles)
// 2. In the website checkout: NEXT_PUBLIC_SUPABASE_URL=http://localhost:54399
//    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=demo SUPABASE_SECRET_KEY=demo npx next dev -p 3100
// 3. ROLES_FILE=<same file> node capture/admin.cjs <outDir>
// Nothing here touches a real database: every /api/admin call that matters is answered below.
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:3100';
const OUT = process.argv[2];
const ROLES_FILE = process.env.ROLES_FILE;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dashboard = {
  redirects: { total: 48, active: 41 },
  courses: { total: 12, upcoming: 4 },
  banner: { active: true, message: 'Join us this Sunday at 10:30am' },
  popup: { active: false, title: '' },
  posts: { total: 36, drafts: 3 },
  shop: { totalProducts: 18, drafts: 2, totalStock: 214, lowStock: [], soldThisYearPennies: 482500, pendingOrders: 1, paidUnfulfilled: 3 },
};
// The stand-in session says it has passed two-factor sign-in (aal2), which is all middleware reads.
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u-admin', exp: Math.floor(Date.now() / 1000) + 86400, aal: 'aal2', role: 'authenticated' })}.sig`;
const session = { access_token: jwt, refresh_token: 'r', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, token_type: 'bearer', user: { id: 'u-admin', email: 'sam.taylor@example.com', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} } };

async function shoot(b, { name, roles, path, onboarding, before, w = 1512, h = 982 }) {
  if (ROLES_FILE) {
    const prev = fs.existsSync(ROLES_FILE) ? fs.readFileSync(ROLES_FILE, 'utf8').trim() : '';
    if (prev !== roles) { fs.writeFileSync(ROLES_FILE, roles); await sleep(16000); } // middleware caches roles for 15s
  }
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await ctx.addCookies([{ name: 'sb-localhost-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), url: BASE }]);
  await ctx.addInitScript(() => {
    localStorage.setItem('destiny-cookie-consent', JSON.stringify({ essential: true, media: true, analytics: false, updatedAt: Date.now() }));
    localStorage.setItem('dc-admin-avatar-prompt-dismissed:u-admin', '1');
  });
  // Same gating as app/api/admin/dashboard: each section only for the roles that cover it.
  const has = (r) => roles.split(',').some((x) => x === r || x === 'super_admin');
  const dash = { redirects: has('site_admin') ? dashboard.redirects : null, posts: has('site_admin') ? dashboard.posts : null, courses: has('event_admin') ? dashboard.courses : null, popup: has('event_admin') ? dashboard.popup : null, banner: has('super_admin') ? dashboard.banner : null, shop: has('store_admin') ? dashboard.shop : null };
  await ctx.route('**/api/admin/dashboard', (r) => r.fulfill({ json: dash }));
  await ctx.route('**/api/admin/notifications**', (r) => r.fulfill({ json: [] }));
  await ctx.route('**/api/admin/onboarding', (r) => (r.request().method() === 'GET' ? r.fulfill({ json: onboarding || { completed_steps: [], gate_seen: true, dismissed: true } }) : r.fulfill({ json: { ok: true } })));
  const p = await ctx.newPage();
  await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 180000 }).catch(() => {});
  await p.addStyleTag({ content: 'nextjs-portal{display:none !important}' });
  await p.waitForTimeout(2500);
  if (before) await before(p);
  await p.screenshot({ path: `${OUT}/admin-${name}.png` });
  console.log('shot', name, p.url());
  await ctx.close();
}

(async () => {
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const b = await chromium.launch();
  const shots = [
    { name: 'dashboard', roles: 'super_admin', path: '/admin' },
    { name: 'dashboard-event', roles: 'event_admin', path: '/admin' },
    { name: 'dashboard-store', roles: 'store_admin', path: '/admin' },
    { name: 'welcome', roles: 'event_admin', path: '/admin', onboarding: { completed_steps: [], gate_seen: false, dismissed: false } },
    {
      name: 'checklist', roles: 'event_admin', path: '/admin', onboarding: { completed_steps: [], gate_seen: true, dismissed: false },
      before: async (p) => { await p.getByRole('button', { name: /get started/i }).first().click().catch((e) => console.log('no launcher', e.message)); await p.waitForTimeout(1200); },
    },
    { name: 'tour', roles: 'event_admin', path: '/admin?tour=1', onboarding: { completed_steps: [], gate_seen: true, dismissed: false }, before: async (p) => p.waitForTimeout(3000) },
    { name: 'help', roles: 'event_admin', path: '/admin/help' },
  ].filter((s) => !only || only.includes(s.name));
  // Group by role so the 15s role cache is waited out as few times as possible.
  shots.sort((a, b2) => a.roles.localeCompare(b2.roles));
  for (const s of shots) await shoot(b, s);
  await b.close();
})();
