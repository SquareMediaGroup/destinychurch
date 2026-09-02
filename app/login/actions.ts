"use server";

import { cookies, headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { REMEMBER_COOKIE_NAME } from "@/utils/supabase/sessionCookie";
import { checkRateLimit, resetRateLimit } from "@/lib/loginRateLimit";
import { getSystemAccess, type SystemAccess } from "@/lib/staffPortalAuth";
import { ADMIN_ROLES, getRoles } from "@/lib/adminRoles";
import { recordAudit } from "@/lib/audit.server";

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 400; // matches Supabase's own default cookie lifetime

/**
 * Everything a sign-in does except decide where you end up.
 *
 * Split out because the live chat needs to sign a Host in without leaving the
 * page: `redirect()` throws to unwind the request, which works fine for a
 * full-page form and not at all for a modal that has to stay put and re-render.
 * The rate limit and the remember-me cookie are identical either way, so they
 * live here and the two callers differ only in their ending.
 */
async function signInCore(
  formData: FormData,
): Promise<{ success: boolean; error?: string; userId?: string }> {
  // Resolve client IP (works on Vercel and most reverse proxies)
  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ??
    headersList.get("x-real-ip") ??
    "unknown";

  const { allowed, retryAfterSeconds } = checkRateLimit(ip);
  if (!allowed) {
    const mins = Math.ceil(retryAfterSeconds / 60);
    return {
      success: false,
      error: `Too many login attempts. Please try again in ${mins} minute${mins !== 1 ? "s" : ""}.`,
    };
  }

  const email = formData.get("email")?.toString().trim() ?? "";
  const password = formData.get("password")?.toString() ?? "";

  if (!email || !password) {
    return { success: false, error: "Email and password are required." };
  }

  const remember = formData.get("remember") === "on";

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore, { remember });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    // Recorded with no actor — nobody signed in. Rate-limited attempts are
    // deliberately *not* logged: they are bot noise and would bury the
    // entries a person needs to see. A wrong password on a real address is
    // the one worth keeping.
    await recordAudit({
      actor: { id: null, email: null, roles: [] },
      action: "login",
      section: "account",
      entity: "sign-in",
      entityLabel: email,
      summary: `Failed sign-in attempt for ${email}`,
      changes: null,
      metadata: { ok: false, email, ip },
    });
    return { success: false, error: "Invalid email or password." };
  }

  cookieStore.set(REMEMBER_COOKIE_NAME, remember ? "1" : "0", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  });

  resetRateLimit(ip);

  // Sign-in happens outside the /admin middleware, so the actor is passed
  // explicitly rather than read from the headers it sets.
  const roles = await getRoles(createServiceClient(), data.user.id);
  await recordAudit({
    actor: {
      id: data.user.id,
      email: data.user.email ?? email,
      roles: ADMIN_ROLES.filter((role) => roles[role]),
    },
    action: "login",
    section: "account",
    entity: "sign-in",
    entityId: data.user.id,
    entityLabel: data.user.email ?? email,
    summary: `${data.user.email ?? email} signed in`,
    changes: null,
    metadata: { ok: true, remembered: remember, ip },
  });

  return { success: true, userId: data.user.id };
}

export async function adminSignIn(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string; email?: string; access?: SystemAccess }> {
  const result = await signInCore(formData);
  if (!result.success || !result.userId) return result;

  const access = await getSystemAccess(createServiceClient(), result.userId);
  if (!access.hasAdmin && !access.hasPortal) {
    return {
      success: false,
      error: "Your account isn't set up for the dashboard or the staff portal yet. Contact an administrator.",
    };
  }

  // Hand access back to the client to render the "choose a system" screen —
  // a card is greyed out for whichever system this account can't open.
  return { success: true, email: formData.get("email")?.toString().trim(), access };
}

/**
 * Sign-in for the Host popup on /live.
 *
 * Same checks as adminSignIn, but returns instead of redirecting so the page
 * behind the modal stays where it is — the Host is in the middle of a service
 * and being thrown to /admin is the one thing that must not happen. The client
 * calls router.refresh() on success to pick the new session up.
 *
 * Note this does NOT check the host role: it establishes who you are, and the
 * chat routes decide what that lets you do (lib/liveChatAuth.ts). Signing in
 * here as a non-Host is a valid thing to do and simply grants no chat powers.
 */
export async function hostSignIn(
  _prev: unknown,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  return signInCore(formData);
}

export async function adminSignOut(): Promise<void> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Read who it is before the session goes — afterwards there is nobody to name.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const roles = await getRoles(createServiceClient(), user.id);
    await recordAudit({
      actor: {
        id: user.id,
        email: user.email ?? null,
        roles: ADMIN_ROLES.filter((role) => roles[role]),
      },
      action: "logout",
      section: "account",
      entity: "sign-out",
      entityId: user.id,
      entityLabel: user.email ?? user.id,
      summary: `${user.email ?? "An admin"} signed out`,
      changes: null,
    });
  }

  await supabase.auth.signOut();
  cookieStore.delete(REMEMBER_COOKIE_NAME);
}
