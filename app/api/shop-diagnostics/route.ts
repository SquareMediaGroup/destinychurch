// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY DIAGNOSTIC ENDPOINT — remove alongside components/shop/ShopDiagnostics.tsx
// once the /shop blank-page bug is identified.
//
// Receives a client-side snapshot captured at the moment /shop renders blank in
// Chrome, and does two things with it:
//
//   1. console.error — lands in the Vercel runtime logs, always, even if the
//      GitHub step is unavailable. This is the reliable channel.
//   2. Files (or comments on) a GitHub issue, reusing the GITHUB_TOKEN already
//      wired up for components/report-bug/actions.ts. Deduped by reason+route so
//      a recurring bug appends to one issue instead of opening dozens.
//
// This is a public, unauthenticated endpoint that can create GitHub issues, so
// it is deliberately fenced: same-origin only, body size capped, rate limited,
// and capped at one issue per reason+route with follow-ups as comments.
// ─────────────────────────────────────────────────────────────────────────────

const REPO = "SquareMediaGroup/destinychurch";
const LABELS = ["bug", "shop-blank-page"];
const MAX_BODY_BYTES = 32_000;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

// Best-effort only: serverless instances are ephemeral, so this dampens bursts
// rather than enforcing a hard quota. The real backstop is the dedupe below.
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

function isLocal(request: Request): boolean {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("localhost") || host.startsWith("127.0.0.1");
}

async function fileGitHubIssue(title: string, body: string) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("🐛 shop-diagnostics: GITHUB_TOKEN missing — logged only.");
    return;
  }

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };

  // Dedupe: one open issue per reason+route, follow-ups become comments.
  const existing = await fetch(
    `https://api.github.com/repos/${REPO}/issues?state=open&labels=${encodeURIComponent("shop-blank-page")}&per_page=100`,
    { headers },
  );

  if (existing.ok) {
    const issues = (await existing.json()) as { number: number; title: string }[];
    const match = issues.find((i) => i.title === title);
    if (match) {
      await fetch(
        `https://api.github.com/repos/${REPO}/issues/${match.number}/comments`,
        { method: "POST", headers, body: JSON.stringify({ body }) },
      );
      return;
    }
  }

  await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers,
    body: JSON.stringify({ title, body, labels: LABELS }),
  });
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
  if (rateLimited(`${ip}:${reason}`)) {
    return Response.json({ ok: true, throttled: true });
  }

  // Channel 1: always, and the one that can't fail. Visible in Vercel logs.
  console.error(
    `🛑 shop-diagnostics [${reason}] ${route}\n${JSON.stringify(payload, null, 2)}`,
  );

  // Channel 2: durable, deduped, but skipped from localhost so dev noise never
  // reaches the issue tracker.
  if (!isLocal(request)) {
    const title = `/shop blank page — ${reason} on ${route}`;
    const body = [
      `Automatic diagnostic from \`ShopDiagnostics\`.`,
      ``,
      `**Reason:** \`${reason}\``,
      `**Route:** \`${route}\``,
      ``,
      `<details><summary>Full snapshot</summary>`,
      ``,
      "```json",
      JSON.stringify(payload, null, 2),
      "```",
      ``,
      `</details>`,
    ].join("\n");

    try {
      await fileGitHubIssue(title, body);
    } catch (err) {
      console.error("🐛 shop-diagnostics: GitHub write failed:", err);
    }
  }

  return Response.json({ ok: true });
}
