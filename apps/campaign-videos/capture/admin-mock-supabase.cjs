// A stand-in Supabase for screenshotting /admin with no real account or data.
// It answers just enough for middleware.ts: auth/v1/user (one invented admin) and their
// admin_roles row. Every other table reads as empty; the pages' /api/admin/* calls are
// answered with sample data by capture/admin.cjs instead.
// Usage: PORT=54399 ROLES=super_admin node capture/admin-mock-supabase.cjs
const http = require('http');
const PORT = Number(process.env.PORT || 54399);
const ALL = ['training_admin', 'event_admin', 'store_admin', 'site_admin', 'hr_admin', 'design_admin', 'sermon_admin', 'safeguarding_admin', 'destiny_one_admin', 'super_admin'];
const roles = () => (process.env.ROLES_FILE ? require('fs').readFileSync(process.env.ROLES_FILE, 'utf8').trim() : process.env.ROLES || 'super_admin').split(',');
const user = { id: 'u-admin', aud: 'authenticated', role: 'authenticated', email: 'sam.taylor@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const send = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' });
    res.end(JSON.stringify(body));
  };
  if (req.method === 'OPTIONS') return send(204, {});
  if (url.pathname === '/auth/v1/user') return send(200, user);
  const one = (req.headers.accept || '').includes('vnd.pgrst.object');
  if (url.pathname === '/rest/v1/admin_roles') {
    const r = roles();
    const row = { auth_user_id: user.id, email: user.email, avatar_url: null, name: 'Sam Taylor', ...Object.fromEntries(ALL.map((k) => [k, r.includes(k)])) };
    return send(200, one ? row : [row]);
  }
  if (url.pathname.startsWith('/rest/v1/')) return one ? send(406, { code: 'PGRST116', message: 'no rows' }) : send(200, []);
  if (url.pathname.startsWith('/storage/')) return send(200, []);
  send(200, {});
}).listen(PORT, () => console.log('mock supabase on', PORT));
