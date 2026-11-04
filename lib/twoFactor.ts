// Two-factor sign-in for admins — the parts middleware needs.
//
// Edge-safe (no node:crypto, no server-only), because middleware.ts imports
// it. The backup-code half lives in lib/twoFactor.server.ts.
//
// How it fits together:
//   - The authenticator app is a Supabase Auth TOTP factor. Verifying a code
//     from it upgrades the session's JWT from `aal1` (password only) to `aal2`.
//   - middleware.ts refuses every /admin page and /api/admin route to a session
//     that isn't aal2, cookie or bearer alike (the D1 Admin desktop app uses a
//     bearer). Pages go to /login/2fa; API calls get a 401 with a `code` below.
//   - /login/2fa enrols the app the first time (QR code, then 8 backup codes
//     shown once) and asks for a code every time after.

import type { User } from "@supabase/supabase-js";

export type AssuranceLevel = "aal1" | "aal2";

/** What an /api/admin caller is told when the session hasn't done its second step. */
export const TWO_FACTOR_CODES = {
  /** Has an authenticator app: ask for a code. */
  required: "two_factor_required",
  /** No authenticator app yet: set one up on the website first. */
  setupRequired: "two_factor_setup_required",
} as const;

/** Where the website sends someone to do their second step. */
export const TWO_FACTOR_PATH = "/login/2fa";

/**
 * The assurance level a Supabase access token was issued at.
 *
 * Only call this on a token Supabase has already accepted (`auth.getUser()`
 * has validated its signature): this decodes, it does not verify.
 */
export function assuranceLevelOf(accessToken: string | null | undefined): AssuranceLevel | null {
  if (!accessToken) return null;
  const part = accessToken.split(".")[1];
  if (!part) return null;
  try {
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(padded)) as { aal?: unknown };
    return payload.aal === "aal1" || payload.aal === "aal2" ? payload.aal : null;
  } catch {
    return null;
  }
}

/** True when the account has a confirmed authenticator app. */
export function hasAuthenticator(user: Pick<User, "factors"> | null | undefined): boolean {
  return (user?.factors ?? []).some((f) => f.factor_type === "totp" && f.status === "verified");
}

/**
 * Where /login/2fa may send someone afterwards. Only same-site paths into the
 * admin or back to the system chooser, so `?next=` can't become an open
 * redirect.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/admin";
  if (next === "/login" || next === "/admin" || next.startsWith("/admin/")) return next;
  return "/admin";
}

/** The text file a person downloads their backup codes as. */
export function backupCodesFile(codes: string[], email: string): string {
  return [
    "Destiny Church admin - two-factor backup codes",
    `Account: ${email}`,
    `Created: ${new Date().toLocaleString("en-GB")}`,
    "",
    "Each code works once. Keep them somewhere safe, such as a note in Bitwarden.",
    "",
    ...codes,
    "",
  ].join("\n");
}
