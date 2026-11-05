// A stand-in Supabase for filming /admin with no real account or data.
//
// It answers auth/v1/user (one invented admin) and their admin_roles row, enough for middleware.ts,
// and it is a small working database: every other table lives in memory, so the site's own API
// routes really insert, update, upsert and delete rows, and what one page saves the next one reads.
// Storage works too (uploads are kept in memory and served back), so photos upload and show.
// Nothing here talks to the real project, and everything is gone when the process stops.
//
// Usage: PORT=54399 ROLES_FILE=<file> [SEED=capture/shop-seed.cjs] node capture/admin-mock-supabase.cjs
// ROLES_FILE holds a comma-separated list of admin roles and is re-read on every request, so a
// capture script can switch roles between shots (middleware caches roles for 15s).
//
// The PostgREST subset is what the admin's routes use: select with one level of embedding
// (`*, variants:product_variants(*)`), eq/neq/in/gt/gte/lt/lte/is filters, order, limit, offset,
// single/maybeSingle, exact counts, insert, update, upsert on id, delete. Filters it doesn't know
// (or=, not.) are ignored rather than refused, which only ever shows more rows, never fewer.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 54399);
const BASE = `http://localhost:${PORT}`;
const ALL = ['training_admin', 'event_admin', 'store_admin', 'site_admin', 'hr_admin', 'design_admin', 'sermon_admin', 'safeguarding_admin', 'destiny_one_admin', 'super_admin'];
const roles = () => (process.env.ROLES_FILE && fs.existsSync(process.env.ROLES_FILE) ? fs.readFileSync(process.env.ROLES_FILE, 'utf8').trim() : process.env.ROLES || 'super_admin').split(',');
const user = { id: 'u-admin', aud: 'authenticated', role: 'authenticated', email: 'sam.taylor@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };

// ── Tables ───────────────────────────────────────────────────────────────────
const now = () => new Date().toISOString();
const DEFAULTS = {
  products: () => ({ description: null, base_price_pennies: 0, category: null, fit: 'unisex', product_type: 'clothing', images: [], is_published: false, is_featured: false, sort_order: 0 }),
  product_variants: () => ({ size: '', color: '', color_hex: null, sku: null, price_pennies: null, stock: 0, is_active: true, sort_order: 0 }),
  shop_hero_slides: () => ({ active: true, heading: null, subheading: null, cta_text: null, cta_link: null, image_url: null, image_path: null, sort_order: 0 }),
  orders: () => ({ notes: null, customer_phone: null, status: 'pending', fulfillment_method: 'collection', currency: 'gbp', paid_at: null, stripe_payment_intent_id: null }),
};
// alias:table(*) embeds, by the foreign key on the child table.
const EMBEDS = { product_variants: 'product_id', order_items: 'order_id' };

const db = {};
const table = (t) => (db[t] ??= []);
function row(t, values) {
  const r = { id: crypto.randomUUID(), created_at: now(), updated_at: now(), ...(DEFAULTS[t]?.() ?? {}), ...values };
  return r;
}
// A seed module exports ({ base }) => ({ table: [rows] }), and may also export:
//   defaults: { table: () => ({ column: value }) }  column defaults the database would fill in
//   embeds:   { child_table: 'foreign_key' }         more alias:table(*) relations
//   rpc:      { name: (args, { table, row, now }) => result }  database functions the routes call
//   files:    [{ bucket, path, file, type }]           storage objects to preload
const seedMod = process.env.SEED ? require(path.resolve(process.env.SEED)) : null;
Object.assign(DEFAULTS, seedMod?.defaults ?? {});
Object.assign(EMBEDS, seedMod?.embeds ?? {});
const RPC = seedMod?.rpc ?? {};
if (seedMod) {
  const seed = seedMod({ base: BASE });
  for (const [t, rows] of Object.entries(seed)) for (const r of rows) table(t).push(row(t, r));
}

// ── Filters ──────────────────────────────────────────────────────────────────
const RESERVED = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns', 'or', 'and']);
function parseValue(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  return v;
}
const eq = (a, b) => (a === null || a === undefined ? b === null : typeof a === 'number' ? a === Number(b) : typeof a === 'boolean' ? a === b : String(a) === String(b));
function matcher(params) {
  const tests = [];
  for (const [k, raw] of params) {
    if (RESERVED.has(k)) continue;
    const m = /^(not\.)?(eq|neq|in|gt|gte|lt|lte|is|like|ilike)\.(.*)$/s.exec(raw);
    if (!m) continue;
    const [, not, op, val] = m;
    let t;
    if (op === 'in') {
      const list = val.replace(/^\(|\)$/g, '').split(',').map((s) => parseValue(s.replace(/^"|"$/g, '')));
      t = (r) => list.some((x) => eq(r[k], x));
    } else if (op === 'is') t = (r) => eq(r[k], parseValue(val));
    else if (op === 'like' || op === 'ilike') {
      const re = new RegExp('^' + val.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/%/g, '.*') + '$', op === 'ilike' ? 'i' : '');
      t = (r) => re.test(String(r[k] ?? ''));
    } else {
      const v = parseValue(val);
      t = {
        eq: (r) => eq(r[k], v),
        neq: (r) => !eq(r[k], v),
        gt: (r) => r[k] > v,
        gte: (r) => r[k] >= v,
        lt: (r) => r[k] < v,
        lte: (r) => r[k] <= v,
      }[op];
    }
    tests.push(not ? (r) => !t(r) : t);
  }
  return (r) => tests.every((t) => t(r));
}
function ordered(rows, order) {
  if (!order) return rows;
  const keys = order.split(',').map((s) => {
    const [col, dir = 'asc', nulls] = s.split('.');
    return { col, desc: dir === 'desc', nulls };
  });
  return [...rows].sort((a, b) => {
    for (const { col, desc } of keys) {
      const x = a[col], y = b[col];
      if (x === y) continue;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      const c = x < y ? -1 : 1;
      return desc ? -c : c;
    }
    return 0;
  });
}
// "*, variants:product_variants(*)" → plain columns + embeds.
function shape(rows, select) {
  if (!select || select === '*') return rows.map((r) => ({ ...r }));
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of select) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return rows.map((r) => {
    const out = {};
    for (const p of parts) {
      const emb = /^(?:(\w+):)?(\w+)(?:!\w+)?\((.*)\)$/.exec(p);
      if (emb) {
        const [, alias, child, sub] = emb;
        const fk = EMBEDS[child];
        out[alias || child] = fk ? shape(ordered(table(child).filter((c) => c[fk] === r.id), 'sort_order.asc'), sub) : [];
      } else if (p === '*') Object.assign(out, r);
      else {
        const [col, as] = p.split(':').reverse();
        out[as || col] = r[col];
      }
    }
    return out;
  });
}

// ── Storage ──────────────────────────────────────────────────────────────────
const files = new Map(); // "bucket/path" → { type, body }

// ── Server ───────────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, BASE);
  const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*', 'access-control-expose-headers': 'content-range' };
  const send = (status, body, extra = {}) => {
    res.writeHead(status, { 'content-type': 'application/json', ...headers, ...extra });
    res.end(body === undefined ? '' : JSON.stringify(body));
  };
  if (req.method === 'OPTIONS') return send(204);
  const body = await readBody(req);

  if (url.pathname === '/auth/v1/user') return send(200, user);
  if (url.pathname.startsWith('/auth/')) return send(200, {});

  // Storage: upload, remove, serve.
  let m;
  if ((m = /^\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/.exec(url.pathname))) {
    const f = files.get(`${m[1]}/${decodeURIComponent(m[2])}`);
    if (!f) return send(404, { error: 'not found' });
    res.writeHead(200, { 'content-type': f.type, 'cache-control': 'no-store', ...headers });
    return res.end(f.body);
  }
  if ((m = /^\/storage\/v1\/object\/([^/]+)\/(.+)$/.exec(url.pathname)) && (req.method === 'POST' || req.method === 'PUT')) {
    const key = `${m[1]}/${decodeURIComponent(m[2])}`;
    files.set(key, { type: req.headers['content-type'] || 'application/octet-stream', body });
    return send(200, { Key: key, Id: crypto.randomUUID() });
  }
  if ((m = /^\/storage\/v1\/object\/([^/]+)$/.exec(url.pathname)) && req.method === 'DELETE') {
    const { prefixes = [] } = JSON.parse(body.toString() || '{}');
    for (const p of prefixes) files.delete(`${m[1]}/${p}`);
    return send(200, prefixes.map((name) => ({ name })));
  }
  if (url.pathname.startsWith('/storage/')) return send(200, []);

  if (!url.pathname.startsWith('/rest/v1/')) return send(200, {});
  if (url.pathname.startsWith('/rest/v1/rpc/')) {
    const name = url.pathname.slice('/rest/v1/rpc/'.length);
    const fn = RPC[name];
    if (!fn) return send(404, { code: 'PGRST202', message: `function ${name} is not in the pretend database` });
    try {
      const out = fn(body.length ? JSON.parse(body.toString()) : {}, { table, row, now, db });
      return send(200, out ?? null);
    } catch (e) {
      return send(400, { code: 'P0001', message: e.message });
    }
  }
  const t = url.pathname.slice('/rest/v1/'.length);
  const accept = req.headers.accept || '';
  const prefer = req.headers.prefer || '';
  const one = accept.includes('vnd.pgrst.object');
  const params = [...url.searchParams.entries()];
  const select = url.searchParams.get('select');

  if (t === 'admin_roles') {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(200, one ? {} : []);
    const r = roles();
    const row0 = { auth_user_id: user.id, email: user.email, avatar_url: null, name: 'Sam Taylor', ...Object.fromEntries(ALL.map((k) => [k, r.includes(k)])) };
    return send(200, one ? row0 : [row0]);
  }

  const rows = table(t);
  const match = matcher(params);
  const reply = (list) => {
    const shaped = shape(list, select);
    if (one) {
      if (shaped.length !== 1) return send(406, { code: 'PGRST116', message: `JSON object requested, ${shaped.length} rows returned`, details: null, hint: null });
      return send(200, shaped[0]);
    }
    return send(200, shaped);
  };

  if (req.method === 'GET' || req.method === 'HEAD') {
    let list = ordered(rows.filter(match), url.searchParams.get('order'));
    const total = list.length;
    const offset = Number(url.searchParams.get('offset') || 0);
    const limit = url.searchParams.get('limit');
    list = list.slice(offset, limit ? offset + Number(limit) : undefined);
    const range = { 'content-range': total ? `${offset}-${offset + list.length - 1}/${total}` : `*/${total}` };
    if (req.method === 'HEAD') return send(200, undefined, range);
    const shaped = shape(list, select);
    if (one) return reply(list);
    return send(200, shaped, prefer.includes('count=') ? range : {});
  }

  const payload = body.length ? JSON.parse(body.toString()) : {};
  const wantRows = prefer.includes('return=representation');

  if (req.method === 'POST') {
    const items = Array.isArray(payload) ? payload : [payload];
    const merge = prefer.includes('resolution=merge-duplicates');
    const key = url.searchParams.get('on_conflict') || 'id';
    const out = [];
    for (const item of items) {
      const existing = merge && item[key] !== undefined ? rows.find((r) => r[key] === item[key]) : null;
      if (existing) {
        Object.assign(existing, item, { updated_at: now() });
        out.push(existing);
      } else {
        const r = row(t, item);
        rows.push(r);
        out.push(r);
      }
    }
    return wantRows ? reply(out) : send(201, undefined);
  }
  if (req.method === 'PATCH') {
    const hit = rows.filter(match);
    for (const r of hit) Object.assign(r, payload, { updated_at: now() });
    return wantRows ? reply(hit) : send(204);
  }
  if (req.method === 'DELETE') {
    const hit = rows.filter(match);
    db[t] = rows.filter((r) => !hit.includes(r));
    // Cascade to embedded children, as the real foreign keys do.
    for (const [child, fk] of Object.entries(EMBEDS)) if (db[child]) db[child] = db[child].filter((c) => !hit.some((h) => h.id === c[fk]));
    return wantRows ? reply(hit) : send(204);
  }
  send(405, { message: 'method not allowed' });
}).listen(PORT, () => console.log('mock supabase on', PORT, process.env.SEED ? `(seeded from ${process.env.SEED})` : ''));

for (const f of seedMod?.files ?? []) files.set(`${f.bucket}/${f.path}`, { type: f.type || 'image/webp', body: fs.readFileSync(f.file) });
