// Destiny One — changing your own password (GET/POST /me/password).
//
// A password can only be changed by someone who can prove it's them:
//   - account already has a password → the current password, checked here
//     against Supabase (a throwaway client, so nothing is signed in or out).
//   - no password yet (email-code sign-in) → nothing to check on the server;
//     the app asks for Face ID / passcode first (src/lib/auth.ts).
// The check lives on the server, not just in the app, so a stolen session
// token alone can't take over an account by setting a new password.
//
// Supabase's weak / leaked password refusal comes back as a `invalid` error
// whose message is `password_rejected:<reason,reason>`; the app turns that
// into the same rejection card as before.

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { isAuthWeakPasswordError } from "@supabase/supabase-js";
import { validateNewPassword } from "@destiny/shared";
import type { AuthUser } from "@/lib/destinyOne/auth.server";
import { OneError } from "@/lib/destinyOne/http";
import { createServiceClient } from "@/utils/supabase/service";
import { sendEmailCard } from "@/lib/emailCard";

export async function hasPassword(userId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc("d1_has_password", { p_user: userId });
  if (error) throw new OneError("unavailable", "Something went wrong. Please try again.");
  return data === true;
}

async function currentPasswordIsRight(email: string, password: string): Promise<boolean> {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new OneError("unavailable", "Changing your password isn't available right now.");
  const probe = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await probe.auth.signInWithPassword({ email, password });
  return !error;
}

/** How recently someone must have signed in to set a first password. */
const FIRST_PASSWORD_WINDOW_SECONDS = 15 * 60;

/**
 * When this session actually signed in (seconds since 1970), from the access
 * token's `amr` claim, which Supabase fills with each sign-in method and when
 * it was used. A token refresh doesn't move it. Null if the token carries none.
 *
 * Only call this on a token Supabase has already accepted (authenticate()):
 * this decodes, it does not verify.
 */
export function signedInAt(accessToken: string | null): number | null {
  const part = accessToken?.split(".")[1];
  if (!part) return null;
  try {
    const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8")) as { amr?: unknown };
    const times = (Array.isArray(payload.amr) ? payload.amr : [])
      .map((entry) => (entry as { timestamp?: unknown } | null)?.timestamp)
      .filter((t): t is number => typeof t === "number" && Number.isFinite(t));
    return times.length ? Math.max(...times) : null;
  } catch {
    return null;
  }
}

export async function changePassword(
  user: AuthUser,
  password: string,
  current: string | undefined,
  accessToken: string | null = null,
): Promise<void> {
  const problem = validateNewPassword(password, user.email ?? null);
  if (problem) throw new OneError("invalid", problem);

  const hadPassword = await hasPassword(user.id);
  if (hadPassword) {
    if (!current) throw new OneError("invalid", "Enter your current password.");
    if (!user.email || !(await currentPasswordIsRight(user.email, current))) {
      throw new OneError("invalid", "That isn't your current password.");
    }
  } else {
    // No password to check, and the app's Face ID prompt is the app's word,
    // not ours: with a copied session token alone, anyone could give the
    // account a password of their choosing and keep it. So a first password
    // needs a fresh sign-in, which takes the emailed code. A token with no
    // sign-in time on it is let through rather than locking everyone out.
    const at = signedInAt(accessToken);
    if (at !== null && Date.now() / 1000 - at > FIRST_PASSWORD_WINDOW_SECONDS) {
      throw new OneError(
        "rule_violation",
        "To set a password, sign out and sign in again with an email code, then set it within 15 minutes.",
      );
    }
  }

  const { error } = await createServiceClient().auth.admin.updateUserById(user.id, { password });
  if (isAuthWeakPasswordError(error)) throw new OneError("invalid", `password_rejected:${error.reasons.join(",")}`);
  if (error) throw new OneError("unavailable", "Something went wrong. Please try again.");

  // Tell the account's owner, whoever made the change. Never fails the change.
  if (user.email) {
    await sendEmailCard({
      to: user.email,
      subject: hadPassword ? "Your Destiny One password was changed" : "A password was set on your Destiny One account",
      badge: "Destiny One",
      heading: hadPassword ? "Your password was changed" : "A password was set",
      intro: hadPassword
        ? "The password for your Destiny One account was changed. If this was you, there's nothing to do. If it wasn't, contact the church office straight away."
        : "A password was set on your Destiny One account, so it can now be used to sign in as well as an email code. If this was you, there's nothing to do. If it wasn't, contact the church office straight away.",
      rows: [["When", new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })]],
    }).catch((err) => console.error("⚠️ Destiny One password notice not sent:", err));
  }
}
