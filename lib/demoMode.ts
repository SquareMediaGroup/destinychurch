"use client";

// Demo mode — the guarantee that nothing done inside an onboarding tour is real.
//
// A tour that teaches "add a product" must not add a product. Rather than build
// a parallel set of fake admin screens (which would drift from the real ones
// within a month), the tour drives the *real* pages and we cut the wire between
// the browser and the API for as long as it is running.
//
// That works because every write in /admin goes through window.fetch to
// /api/admin/*. There are no server actions under app/admin except the two
// logged-out password pages, no client-side Supabase writes, and no
// XMLHttpRequest anywhere. So swapping window.fetch is a complete boundary, not
// a best-effort one: the request is answered here and never leaves the tab.
//
// Reads still go to the real API, so the pages look like the real thing. What
// the tour "creates" is held in memory and overlaid onto subsequent GETs, which
// is what makes a saved product appear in the list a moment later.
//
// Second, independent layer: entering demo mode sets a dc-demo-mode cookie and
// middleware.ts rejects every non-GET to /api/admin/* while it is present. If
// this interceptor is ever bypassed or missed, the server still refuses.

type Json = Record<string, unknown>;

interface DemoBucket {
  /** Rows invented during the tour, appended to whatever the real GET returns. */
  created: Json[];
  /** id → partial row, merged over the matching real row. */
  updated: Map<string, Json>;
  /** ids filtered out of the real GET. */
  deleted: Set<string>;
  /** Last body written to a single-object endpoint (banner, popup, …). */
  singleton: Json | null;
}

const COOKIE = "dc-demo-mode";

/**
 * Endpoints that hold one thing rather than a list. They're saved with POST or
 * PUT depending on the page, and there is no id involved either way, so a write
 * to one merges into a single stored object instead of appending a row.
 * Anything not listed here is treated as a collection.
 */
const SINGLETONS = new Set([
  "/api/admin/banner",
  "/api/admin/popup",
  "/api/admin/featured-event",
  "/api/admin/featured-event/popup",
  "/api/admin/featured-course",
  "/api/admin/simulated-live",
  "/api/admin/live-chat/session",
]);

/**
 * Fields a row of this collection is expected to have, filled in when the tour
 * "creates" one. The pages read these straight out of the response — a product
 * editor opened on a phantom product would throw on `p.variants.map` otherwise.
 * Only collections a tour actually writes to need an entry.
 */
const ROW_DEFAULTS: Record<string, Json> = {
  "/api/admin/store/products": {
    slug: "demo-product",
    description: null,
    category: null,
    base_price_pennies: 0,
    fit: "unisex",
    product_type: "clothing",
    is_published: false,
    is_featured: false,
    sort_order: 0,
    images: [],
    variants: [],
  },
  "/api/admin/posts": { is_published: false, blocks: [], content: "" },
  "/api/admin/redirects": { active: true, hits: 0 },
  "/api/admin/nfc": { is_active: true, sort_order: 0 },
  "/api/admin/training/categories": { sort_order: 0, subgroups: [] },
};
const store = new Map<string, DemoBucket>();

let realFetch: typeof window.fetch | null = null;
let counter = 0;

/** Every write we swallowed, for the checklist's "nothing was saved" note and tests. */
const swallowed: { method: string; url: string }[] = [];

function bucket(key: string): DemoBucket {
  let b = store.get(key);
  if (!b) {
    b = { created: [], updated: new Map(), deleted: new Set(), singleton: null };
    store.set(key, b);
  }
  return b;
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  const m = init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
  return (m || "GET").toUpperCase();
}

/**
 * Split an admin API path into the collection it belongs to and the row it
 * addresses. `/api/admin/redirects/42` → `{ key: "/api/admin/redirects", id: "42" }`;
 * `/api/admin/nfc?id=42` → the same, because the NFC routes pass the id as a query.
 */
function target(rawUrl: string): { path: string; key: string; id: string | null; query: URLSearchParams } {
  const url = new URL(rawUrl, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  const path = url.pathname;
  const segments = path.split("/").filter(Boolean); // api, admin, <collection>, [id]
  const queryId = url.searchParams.get("id");

  // A trailing segment that looks like an id (uuid, number, or our own demo id)
  // addresses a row; anything else ("upload", "check-slug", "orders") is part of
  // the collection path.
  const last = segments[segments.length - 1] ?? "";
  const looksLikeId =
    segments.length > 3 &&
    (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(last) || /^\d+$/.test(last) || last.startsWith("demo-"));

  const key = looksLikeId ? `/${segments.slice(0, -1).join("/")}` : path;
  return { path, key, id: looksLikeId ? last : queryId, query: url.searchParams };
}

async function bodyOf(input: RequestInfo | URL, init?: RequestInit): Promise<Json> {
  const raw = init?.body ?? (typeof input === "object" && "body" in input ? null : null);

  if (raw instanceof FormData) {
    const out: Json = {};
    raw.forEach((value, name) => {
      out[name] = value instanceof File ? value.name : value;
    });
    return out;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Json) : {};
    } catch {
      return {};
    }
  }
  if (input instanceof Request) {
    try {
      return (await input.clone().json()) as Json;
    } catch {
      return {};
    }
  }
  return {};
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Uploads never touch storage. An object URL points at the file the user just
 * picked, so the preview looks exactly right and disappears with the tab.
 * Shape matches app/api/admin/popup/upload/route.ts — { url, path }.
 */
function fakeUpload(init?: RequestInit): Response {
  const body = init?.body;
  let url = "";
  if (body instanceof FormData) {
    const file = body.get("file");
    if (file instanceof File) url = URL.createObjectURL(file);
  }
  return json({ url, path: `demo/${++counter}` });
}

async function overlay(response: Response, key: string): Promise<Response> {
  const b = store.get(key);
  if (!b || !response.ok) return response;
  if (!b.created.length && !b.updated.size && !b.deleted.size && !b.singleton) return response;

  let data: unknown;
  try {
    data = await response.clone().json();
  } catch {
    return response;
  }

  if (Array.isArray(data)) {
    const rows = (data as Json[])
      .filter((row) => !b.deleted.has(String(row.id)))
      .map((row) => {
        const patch = b.updated.get(String(row.id));
        return patch ? { ...row, ...patch } : row;
      });
    return json([...rows, ...b.created]);
  }

  if (data && typeof data === "object") {
    return json({ ...(data as Json), ...(b.singleton ?? {}) });
  }
  return response;
}

async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const pass = realFetch ?? fetch;
  const raw = urlOf(input);
  const method = methodOf(input, init);

  // Only /api/admin is ours. Everything else — Supabase, storage, third parties,
  // Next's own RSC payloads — goes straight through untouched.
  let parsed: ReturnType<typeof target>;
  try {
    parsed = target(raw);
  } catch {
    return pass(input, init);
  }
  if (!parsed.path.startsWith("/api/admin/")) return pass(input, init);

  if (method === "GET" || method === "HEAD") {
    // A row the tour invented has no real counterpart, so this can't go to the
    // network — /api/admin/store/products/demo-1 would 404 and the editor the
    // tour just navigated to would come up blank.
    if (parsed.id?.startsWith("demo-")) {
      const row = store.get(parsed.key)?.created.find((r) => r.id === parsed.id);
      if (row) return json(row);
      return json([]);
    }
    const response = await pass(input, init);
    return overlay(response, parsed.key);
  }

  // ── From here down the request is never sent. ───────────────────────────────
  swallowed.push({ method, url: parsed.path });

  if (parsed.path.endsWith("/upload")) return fakeUpload(init);

  const body = await bodyOf(input, init);
  const b = bucket(parsed.key);
  const now = new Date().toISOString();

  if (method === "DELETE") {
    if (parsed.id) {
      b.deleted.add(parsed.id);
      const at = b.created.findIndex((row) => String(row.id) === parsed.id);
      if (at !== -1) b.created.splice(at, 1);
    }
    return json({ ok: true });
  }

  if (SINGLETONS.has(parsed.key)) {
    b.singleton = { ...(b.singleton ?? {}), ...body, updated_at: now };
    return json(b.singleton);
  }

  if (method === "PUT" || method === "PATCH") {
    const id = parsed.id ?? (typeof body.id === "string" ? body.id : null);
    if (!id) {
      // A single-object endpoint — the banner, the popup, the featured event.
      b.singleton = { ...(b.singleton ?? {}), ...body, updated_at: now };
      return json(b.singleton);
    }
    const at = b.created.findIndex((row) => String(row.id) === id);
    if (at !== -1) {
      b.created[at] = { ...b.created[at], ...body, updated_at: now };
      return json(b.created[at]);
    }
    const merged = { ...(b.updated.get(id) ?? {}), ...body, id, updated_at: now };
    b.updated.set(id, merged);
    return json(merged);
  }

  // POST to a collection — a new row.
  const row: Json = {
    id: `demo-${++counter}`,
    created_at: now,
    updated_at: now,
    ...(ROW_DEFAULTS[parsed.key] ?? {}),
    ...body,
  };
  b.created.push(row);
  return json(row, 201);
}

export function isDemoMode(): boolean {
  return realFetch !== null;
}

export function enterDemoMode(): void {
  if (typeof window === "undefined" || realFetch) return;
  realFetch = window.fetch.bind(window);
  window.fetch = demoFetch as typeof window.fetch;
  document.cookie = `${COOKIE}=1; path=/; max-age=7200; SameSite=Lax`;
}

export function exitDemoMode(): void {
  if (typeof window === "undefined") return;
  if (realFetch) {
    window.fetch = realFetch;
    realFetch = null;
  }
  store.clear();
  swallowed.length = 0;
  clearDemoCookie();
}

/**
 * Called on every admin mount, not just on exit. A tab closed mid-tour would
 * otherwise leave the cookie behind and middleware would refuse real saves for
 * two hours.
 */
export function clearDemoCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** What the tour pretended to save. Read by the tour's closing card. */
export function demoWrites(): { method: string; url: string }[] {
  return [...swallowed];
}

/** Test seam — lets the unit test drive the interceptor without a browser. */
export const __demoInternals = { demoFetch, store, target };
