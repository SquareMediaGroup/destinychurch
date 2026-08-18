// Who someone is in the live chat, when they have no account.
//
// The whole identity is a cookie: a random id, a display name, and an HMAC over
// both. There is no row in auth.users, no email, and nothing to sign up for —
// which is the point. But it does have to be *signed*, for two reasons:
//
//   1. A mute is applied to the guest id. If the cookie were plain JSON a muted
//      guest would just edit it and carry on.
//   2. Nothing in the payload may be able to claim host-ness. Host status is
//      never read from here — it comes from the Supabase session — but a signed
//      cookie means the server can trust the id it's rate-limiting on.
//
// Same construction as lib/trainingAccess.ts: HMAC-SHA256 under the server
// secret, compared with timingSafeEqual, and a secret() that throws rather than
// falling back to a constant.

import { createHmac, timingSafeEqual, randomUUID } from "crypto";

export const GUEST_COOKIE_NAME = "dc_live_guest";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const GUEST_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
};

export interface GuestIdentity {
  /** Random UUID. Safe to show Hosts — it's what a mute is keyed on. */
  id: string;
  name: string;
  /** Seconds since epoch, so a very old cookie can be re-issued. */
  iat: number;
}

function secret(): string {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    // Never fall back to a hardcoded value — a public constant would let anyone
    // forge a guest identity and walk straight through a mute.
    throw new Error("SUPABASE_SECRET_KEY must be set to sign live chat guest cookies");
  }
  return key;
}

function hmac(input: string): string {
  return createHmac("sha256", secret()).update(input).digest("hex");
}

/**
 * The direct-message channel key for a guest.
 *
 * Derived rather than stored, so there is no table to keep in step and no extra
 * round trip when a Host opens a thread. It is an HMAC under the server secret,
 * so the topic name is itself the capability: unguessable without the secret,
 * and stable for as long as the guest keeps their cookie.
 *
 * This value must never appear in anything sent to another client — Host-facing
 * payloads carry `id`, never this. See the realtime.messages policies in
 * supabase/migrations/20260817_live_chat.sql.
 */
export function dmKeyFor(guestId: string): string {
  return hmac(`dm:${guestId}`).slice(0, 32);
}

export function dmTopic(sessionId: string, guestId: string): string {
  return `live-chat:${sessionId}:dm:${dmKeyFor(guestId)}`;
}

export function publicTopic(sessionId: string): string {
  return `live-chat:${sessionId}:public`;
}

export function hostTopic(sessionId: string): string {
  return `live-chat:${sessionId}:host`;
}

export function newGuest(name: string): GuestIdentity {
  return { id: randomUUID(), name, iat: Math.floor(Date.now() / 1000) };
}

export function signGuest(identity: GuestIdentity): string {
  const body = Buffer.from(JSON.stringify(identity), "utf8").toString("base64url");
  return `${body}.${hmac(body)}`;
}

export function verifyGuest(token: string | undefined): GuestIdentity | null {
  if (!token) return null;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  try {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(hmac(body), "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (
      typeof parsed?.id !== "string" ||
      typeof parsed?.name !== "string" ||
      typeof parsed?.iat !== "number"
    ) {
      return null;
    }
    return { id: parsed.id, name: parsed.name, iat: parsed.iat };
  } catch {
    return null;
  }
}
