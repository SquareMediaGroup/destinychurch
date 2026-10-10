// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY DIAGNOSTIC ENDPOINT — remove alongside components/shop/ShopDiagnostics.tsx
// once the /shop blank-page bug is identified.
//
// Receives a client-side snapshot captured at the moment /shop renders blank in
// Chrome and writes it to the Vercel runtime logs (console.error).
//
// This used to also file GitHub issues with GITHUB_TOKEN. That was removed in
// the 2026-10-09 security audit: the endpoint is public and unauthenticated,
// the Origin check is forgeable outside a browser, and the dedupe/rate-limit
// keys (reason + route) are chosen by the caller — so anyone could open
// unlimited issues on the repo with our token. The logs were always the
// reliable channel; search Vercel logs for "shop-diagnostics".
// ─────────────────────────────────────────────────────────────────────────────

const MAX_BODY_BYTES = 32_000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// Best-effort only: serverless instances are ephemeral, so this dampens bursts
// rather than enforcing a hard quota. Keyed on IP alone — `reason` comes from
// the caller, so keying on it let one client mint unlimited buckets.
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS,
  );
  recent.push(now);
  hits.set(key, recent);
  return recent.length > RATE_LIMIT_MAX;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reason = String(payload.reason ?? "unknown");
  const page = (payload.page ?? {}) as { pathname?: string };
  const route = String(page.pathname ?? "unknown");

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) {
    return Response.json({ ok: true, throttled: true });
  }

  // Visible in Vercel logs.
  console.error(
    `🛑 shop-diagnostics [${reason}] ${route}\n${JSON.stringify(payload, null, 2)}`,
  );

  return Response.json({ ok: true });
}
