// Choosing a name to chat under.
//
// This is the closest thing to a sign-up the chat has, and it deliberately
// isn't one: no email, no password, no row in auth.users. The name goes into an
// HMAC-signed cookie (lib/liveChatGuest.ts) and that cookie is the whole
// identity.
//
// Changing your name keeps your existing id, so a mute survives a rename — the
// obvious first thing someone does after being muted.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GUEST_COOKIE_NAME,
  GUEST_COOKIE_OPTIONS,
  newGuest,
  signGuest,
} from "@/lib/liveChatGuest";
import { screenDisplayName } from "@/lib/liveChatModeration";
import { readGuest } from "@/lib/liveChatAuth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: { name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const verdict = screenDisplayName(typeof body.name === "string" ? body.name : "");
  if (!verdict.ok) {
    return NextResponse.json({ error: verdict.reason }, { status: 400 });
  }

  const existing = await readGuest();
  const identity = existing
    ? { ...existing, name: verdict.name }
    : newGuest(verdict.name);

  const jar = await cookies();
  jar.set(GUEST_COOKIE_NAME, signGuest(identity), GUEST_COOKIE_OPTIONS);

  return NextResponse.json({ guest: { id: identity.id, name: identity.name } });
}
