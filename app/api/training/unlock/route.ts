import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import {
  verifyPassword,
  signUnlock,
  unlockCookieName,
  UNLOCK_COOKIE_OPTIONS,
} from "@/lib/trainingAccess";

// Password guesses per IP are capped by the shared limiter (lib/rateLimit.ts),
// which adds a cooldown that grows with each repeat. This route used to keep
// its own counter: it reset every minute with no cooldown, so a script could
// guess 10 a minute indefinitely, and it held one entry per address for the
// life of the instance.
//
// 30 a minute, not the old 10, because a room of volunteers opening the same
// group on the church Wi-Fi shares one address and now a breach costs minutes.
const MAX_ATTEMPTS_PER_MINUTE = 30;

export async function POST(request: Request) {
  if (checkRateLimit(`training-unlock:${clientIp(request)}`, MAX_ATTEMPTS_PER_MINUTE).limited) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const subgroupId = typeof body.subgroupId === "string" ? body.subgroupId : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!subgroupId || !password) {
    return NextResponse.json({ error: "Missing password." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("training_subgroups")
    .select("id, password_hash, is_published")
    .eq("id", subgroupId)
    .maybeSingle();

  if (error || !data || !data.is_published) {
    return NextResponse.json({ error: "Group not found." }, { status: 404 });
  }

  // No password set → it's open; nothing to unlock.
  if (!data.password_hash) {
    return NextResponse.json({ ok: true });
  }

  if (!verifyPassword(password, data.password_hash)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    unlockCookieName(subgroupId),
    signUnlock(subgroupId),
    UNLOCK_COOKIE_OPTIONS,
  );
  return res;
}
