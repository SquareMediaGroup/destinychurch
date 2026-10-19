import { NextResponse, type NextRequest } from "next/server";
import { sendReport } from "@/lib/report";
import { componentCatalog } from "@/lib/status";

// POST /api/report: a "Report a problem" from the page, emailed to the super
// admins. Public, so it only accepts known component ids, caps lengths, drops
// honeypot hits, and limits each address to a few reports per window.

export const dynamic = "force-dynamic";

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 5;
// Per serverless instance only, so a soft limit; enough to stop a stuck
// button or a casual script from flooding the inbox.
const recent = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5_000) recent.clear();
  return hits.length > MAX_PER_WINDOW;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Honeypot filled in: pretend it worked.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const entry = componentCatalog.find((c) => c.id === body.component);
  if (!entry) return NextResponse.json({ error: "Unknown component" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "Too many reports" }, { status: 429 });

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 1000) : "";
  const rawEmail = typeof body.email === "string" ? body.email.trim().slice(0, 200) : "";
  const shownAs = typeof body.shownAs === "string" ? body.shownAs.slice(0, 40) : "Unknown";

  const sent = await sendReport({
    service: entry.service,
    component: entry.name,
    shownAs,
    message,
    email: EMAIL_RE.test(rawEmail) ? rawEmail : null,
    userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  });

  return sent ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not sent" }, { status: 502 });
}
