import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import {
  verifyPassword,
  signUnlock,
  unlockCookieName,
  UNLOCK_COOKIE_OPTIONS,
} from "@/lib/mediaAccess";

// Best-effort in-memory throttle: cap password attempts per IP, same shape as
// app/api/training/unlock/route.ts. Resets every window; survives within a
// single server instance — enough to slow guessing, not a durable rate limit.
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const attempts = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.reset) {
    attempts.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const boardId = typeof body.boardId === "string" ? body.boardId : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!boardId || !password) {
    return NextResponse.json({ error: "Missing password." }, { status: 400 });
  }

  const { data } = await createServiceClient()
    .from("media_boards")
    .select("id, password_hash")
    .eq("id", boardId)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "Board not found." }, { status: 404 });

  // No password set — nothing to unlock, but don't treat it as an error.
  if (!data.password_hash) return NextResponse.json({ ok: true });

  if (!verifyPassword(password, data.password_hash)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(unlockCookieName(boardId), signUnlock(boardId), UNLOCK_COOKIE_OPTIONS);
  return res;
}
