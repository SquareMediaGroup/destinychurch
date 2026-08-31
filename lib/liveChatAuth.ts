// Authorisation for the live chat routes under /api/live-chat.
//
// Read this before adding a route there. Everything else in this app that needs
// a signed-in user lives under /admin or /api/admin, and middleware.ts checks
// those before the handler runs — which is why route bodies elsewhere contain no
// auth code at all (see the comment at the top of app/api/admin/nfc/route.ts).
//
// /api/live-chat is different. It hangs off a public page, guests reach it with
// no session at all, and middleware.ts:73-82 does not match it. So these routes
// authorise themselves, and this file is the only place that should decide who
// someone is. Every handler under /api/live-chat must begin with readGuest() or
// requireHost(); a handler that reads a body before establishing the caller is a
// bug.
//
// Host actions that aren't tied to the public page (the console, the queues)
// belong under /api/admin/live-chat instead, where middleware does the work.

import "server-only";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getRoles } from "@/lib/adminRoles";
import {
  GUEST_COOKIE_NAME,
  verifyGuest,
  type GuestIdentity,
} from "@/lib/liveChatGuest";

export interface HostIdentity {
  userId: string;
  email: string | null;
  name: string;
}

/**
 * The signed guest cookie, or null. Never throws: not having one is the normal
 * state for someone who has just opened the page.
 */
export async function readGuest(): Promise<GuestIdentity | null> {
  const jar = await cookies();
  return verifyGuest(jar.get(GUEST_COOKIE_NAME)?.value);
}

/**
 * Applies the `host` access check to an already-resolved Supabase user (or
 * super_admin, which passes everything by convention — lib/adminRoles.ts:79).
 * Roles come from the service client because admin_roles is deny-all.
 */
async function resolveHost(user: User): Promise<HostIdentity | null> {
  const roles = await getRoles(createServiceClient(), user.id);
  if (!roles.host && !roles.super_admin) return null;

  const email = user.email ?? null;
  // Hosts are staff, so a name is worth showing. Fall back to the local part of
  // the email rather than an id — "dave" reads better than a uuid in a chat.
  const metaName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : null;

  return {
    userId: user.id,
    email,
    name: metaName || email?.split("@")[0] || "Host",
  };
}

/**
 * The signed-in Host, or null.
 *
 * Two checks, both required: a valid Supabase session, and the `host` access
 * level.
 */
export async function readHost(): Promise<HostIdentity | null> {
  const jar = await cookies();
  const supabase = createClient(jar);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return resolveHost(user);
}

/**
 * readHost(), but for handlers that cannot proceed without one. Returns a
 * discriminated result rather than throwing so the caller returns the 401/403
 * itself and the control flow stays visible in the route.
 */
export async function requireHost(): Promise<
  { ok: true; host: HostIdentity } | { ok: false; status: 401 | 403 }
> {
  const jar = await cookies();
  const supabase = createClient(jar);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401 };

  const host = await resolveHost(user);
  if (!host) return { ok: false, status: 403 };

  return { ok: true, host };
}

/**
 * Whether this guest is currently muted, for a session or globally.
 *
 * Checked on every post rather than cached: a mute has to bite immediately, and
 * the whole point of applying one mid-service is that the next message doesn't
 * land.
 */
export async function isGuestBlocked(
  guestId: string,
  sessionId: string,
): Promise<boolean> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("live_chat_blocks")
    .select("id, scope, session_id, expires_at")
    .eq("guest_id", guestId);

  if (!data?.length) return false;

  const now = Date.now();
  return data.some((block) => {
    if (block.expires_at && new Date(block.expires_at).getTime() < now) return false;
    if (block.scope === "global") return true;
    return block.session_id === sessionId;
  });
}

/** Caller IP, matching the resolution order in app/login/actions.ts. */
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
