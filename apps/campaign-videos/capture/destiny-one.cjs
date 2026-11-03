// Screenshots the real Destiny One app (its Expo web build) with sample data instead of the API.
// 1. In apps/destiny-one: EXPO_PUBLIC_SUPABASE_URL=https://demo.supabase.co EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=demo-key
//    EXPO_PUBLIC_API_BASE_URL=https://api.demo.local npx expo export --platform web --output-dir <d1-web>
// 2. D1_WEB=<d1-web> node capture/destiny-one.cjs <outDir> /chats /group/g-worship ...  (DARK=1 for dark mode, H=1500 for a tall capture)
// The web build draws the tab bar as a strip at the top; it's hidden here and the video draws the iPhone glass tab bar instead.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const { handle, me } = require('./destiny-one-sample-data.cjs');
const WEB = process.env.D1_WEB || path.join(__dirname, 'd1-web'); const OUT = process.argv[2]; const routes = process.argv.slice(3);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const exp = Math.floor(Date.now() / 1000) + 86400 * 30;
const jwt = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: 'u-me', exp, role: 'authenticated', aud: 'authenticated', email: 'jordan@example.com' })}.sig`;
const user = { id: 'u-me', aud: 'authenticated', role: 'authenticated', email: 'jordan@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const session = { access_token: jwt, refresh_token: 'r', expires_in: 86400 * 30, expires_at: exp, token_type: 'bearer', user };
const mime = { '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.json': 'application/json', '.svg': 'image/svg+xml', '.wasm': 'application/wasm' };
(async () => {
  const b = await chromium.launch();
  const dark = process.env.DARK === '1';
  const ctx = await b.newContext({ viewport: { width: Number(process.env.W || 402), height: Number(process.env.H || 812) }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: dark ? 'dark' : 'light' });
  await ctx.addInitScript(([s, id]) => {
    localStorage.setItem('sb-demo-auth-token', s);
    localStorage.setItem('d1.setupSeen.v1.' + id, '1');
    localStorage.setItem('d1.releaseSplash.seen.v1', '99.0');
    localStorage.setItem('d1.updatePrompt.seen.v1', '99.0');
    localStorage.setItem('d1.notifAsked', '1');
  }, [JSON.stringify(session), me.id]);
  await ctx.route('https://api.demo.local/**', async (r) => {
    const u = new URL(r.request().url());
    const data = handle(r.request().method(), u.pathname + u.search);
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', generatedAt: new Date().toISOString(), data, notice: null }) });
  });
  await ctx.route('https://demo.supabase.co/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r.request().url().includes('/user') ? user : {}) }));
  await ctx.route('http://app.local/**', async (r) => {
    let p = new URL(r.request().url()).pathname;
    let f = path.join(WEB, decodeURIComponent(p));
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { const h = f + '.html'; f = fs.existsSync(h) ? h : path.join(WEB, 'index.html'); }
    await r.fulfill({ status: 200, contentType: mime[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message.slice(0, 200)));
  for (const route of routes) {
    await p.goto('http://app.local' + route, { waitUntil: 'networkidle' }).catch(() => {});
    await p.addStyleTag({ content: '[role="tablist"]{display:none !important}' }).catch(()=>{});
    await p.waitForTimeout(3500);
    const name = route.replace(/\W+/g, '_').replace(/^_|_$/g, '') || 'root';
    await p.screenshot({ path: `${OUT}/d1-${name}${dark ? '-dark' : ''}${process.env.TAG ? '-' + process.env.TAG : process.env.H ? '-tall' : ''}.png` });
    console.log('shot', name, p.url());
  }
  await b.close();
})();
