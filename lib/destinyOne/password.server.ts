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

export async function changePassword(user: AuthUser, password: string, current: string | undefined): Promise<void> {
  const problem = validateNewPassword(password, user.email ?? null);
  if (problem) throw new OneError("invalid", problem);

  if (await hasPassword(user.id)) {
    if (!current) throw new OneError("invalid", "Enter your current password.");
    if (!user.email || !(await currentPasswordIsRight(user.email, current))) {
      throw new OneError("invalid", "That isn't your current password.");
    }
  }

  const { error } = await createServiceClient().auth.admin.updateUserById(user.id, { password });
  if (isAuthWeakPasswordError(error)) throw new OneError("invalid", `password_rejected:${error.reasons.join(",")}`);
  if (error) throw new OneError("unavailable", "Something went wrong. Please try again.");
}
