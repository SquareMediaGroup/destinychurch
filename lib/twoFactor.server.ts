// Two-factor sign-in — backup codes and the admin-side helpers.
// See lib/twoFactor.ts for how the pieces fit together.
//
// Backup codes: 8 per admin, 16 random characters from a 31-letter alphabet
// (about 79 bits), written XXXX-XXXX-XXXX-XXXX. Only a SHA-256 hash is stored, and
// each works once. Using one removes the authenticator app, so the person has
// to set up a new one there and then (the usual reason is a lost phone), and
// they get an email so a code used by someone else doesn't go unnoticed.

import "server-only";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { REMEMBER_COOKIE_NAME } from "@/utils/supabase/sessionCookie";
import { ADMIN_ROLES, getRoles, type RoleFlags } from "@/lib/adminRoles";
import { assuranceLevelOf, type AssuranceLevel } from "@/lib/twoFactor";
import {
  BACKUP_CODE_COUNT,
  generateBackupCode,
  hashBackupCode,
  looksLikeBackupCode,
} from "@/lib/backupCodes";

type ServiceClient = ReturnType<typeof createServiceClient>;
type SessionClient = ReturnType<typeof createClient>;

export interface SignedInAdmin {
  /** The caller's own cookie session — verifying a code upgrades it in place. */
  session: SessionClient;
  user: User;
  roles: RoleFlags;
  level: AssuranceLevel | null;
}

/**
 * The signed-in caller of a /api/auth/mfa route, if they hold any admin role.
 * Two-factor is an admin thing: everyone else gets null (and a 401).
 *
 * The session client keeps the "keep me signed in" choice, so a code verified
 * on a session-only sign-in doesn't turn it into a 400-day cookie.
 */
export async function signedInAdmin(): Promise<SignedInAdmin | null> {
  const store = await cookies();
  const remember = store.get(REMEMBER_COOKIE_NAME)?.value !== "0";
  const session = createClient(store, { remember });
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return null;
  const roles = await getRoles(createServiceClient(), user.id);
  if (!ADMIN_ROLES.some((role) => roles[role])) return null;
  const {
    data: { session: current },
  } = await session.auth.getSession();
  return { session, user, roles, level: assuranceLevelOf(current?.access_token) };
}

/** Replace every backup code this admin has with 8 new ones. Returns them, once. */
export async function issueBackupCodes(supabase: ServiceClient, userId: string): Promise<string[]> {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode);
  const { error: delError } = await supabase.from("admin_mfa_recovery_codes").delete().eq("auth_user_id", userId);
  if (delError) throw new Error(`Couldn't clear old backup codes: ${delError.message}`);
  const { error } = await supabase
    .from("admin_mfa_recovery_codes")
    .insert(codes.map((code) => ({ auth_user_id: userId, code_hash: hashBackupCode(code) })));
  if (error) throw new Error(`Couldn't save backup codes: ${error.message}`);
  return codes;
}

export async function unusedBackupCodeCount(supabase: ServiceClient, userId: string): Promise<number> {
  const { count } = await supabase
    .from("admin_mfa_recovery_codes")
    .select("id", { count: "exact", head: true })
    .eq("auth_user_id", userId)
    .is("used_at", null);
  return count ?? 0;
}

export type BackupCodeResult =
  | { ok: true; remaining: number }
  | { ok: false; reason: "locked"; lockedUntil: string }
  | { ok: false; reason: "wrong" };

/** When backup codes are locked for this admin, or null. */
async function lockedUntil(supabase: ServiceClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("admin_mfa_lockouts")
    .select("locked_until")
    .eq("auth_user_id", userId)
    .maybeSingle();
  const until = data?.locked_until as string | null | undefined;
  return until && new Date(until).getTime() > Date.now() ? until : null;
}

/**
 * Spend one backup code. The update only matches an unused code, so two
 * requests racing with the same code can't both succeed.
 */
export async function spendBackupCode(
  supabase: ServiceClient,
  userId: string,
  input: string,
): Promise<BackupCodeResult> {
  const locked = await lockedUntil(supabase, userId);
  if (locked) return { ok: false, reason: "locked", lockedUntil: locked };

  if (looksLikeBackupCode(input)) {
    const { data } = await supabase
      .from("admin_mfa_recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("auth_user_id", userId)
      .eq("code_hash", hashBackupCode(input))
      .is("used_at", null)
      .select("id");
    if (data && data.length > 0) {
      await supabase.from("admin_mfa_lockouts").delete().eq("auth_user_id", userId);
      return { ok: true, remaining: await unusedBackupCodeCount(supabase, userId) };
    }
  }

  const { data: until } = await supabase.rpc("admin_mfa_record_failure", { p_user: userId });
  if (typeof until === "string") return { ok: false, reason: "locked", lockedUntil: until };
  return { ok: false, reason: "wrong" };
}

/**
 * Take an admin back to "no two-factor set up": every authenticator factor
 * (verified or half-enrolled) and every backup code. Their next visit to the
 * admin asks them to set it up again.
 */
export async function removeTwoFactor(supabase: ServiceClient, userId: string): Promise<void> {
  const { data, error } = await supabase.auth.admin.mfa.listFactors({ userId });
  if (error) throw new Error(`Couldn't read sign-in factors: ${error.message}`);
  for (const factor of data?.factors ?? []) {
    const { error: delError } = await supabase.auth.admin.mfa.deleteFactor({ userId, id: factor.id });
    if (delError) throw new Error(`Couldn't remove a sign-in factor: ${delError.message}`);
  }
  await supabase.from("admin_mfa_recovery_codes").delete().eq("auth_user_id", userId);
  await supabase.from("admin_mfa_lockouts").delete().eq("auth_user_id", userId);
}

/* ── Emails ─────────────────────────────────────────────────────────────────
   Sent so that a second step someone else got past doesn't go unnoticed.
   Fire-and-forget, like every other notification email: a mail failure must
   never undo the security change it describes (sendEmailCard logs it). */

const SIGN_IN_URL = "https://destinytees.uk/login";

export async function sendBackupCodeUsedEmail(to: string | null | undefined): Promise<void> {
  if (!to) return;
  const { sendEmailCard } = await import("@/lib/emailCard").catch(() => ({ sendEmailCard: null }));
  if (!sendEmailCard) return;
  await sendEmailCard({
    to,
    subject: "A backup code was used on your Destiny Church account",
    badge: "Security",
    heading: "Backup code used",
    intro:
      "Someone signed in to your Destiny Church admin account with one of your backup codes, and your authenticator app was removed so a new one could be set up. If this was you, there's nothing to do. If it wasn't, change your password now and tell a Super Admin.",
    rows: [["When", new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })]],
    ctaHref: SIGN_IN_URL,
    ctaLabel: "Sign in",
  }).catch((err) => console.error("❌ backup-code email failed:", err));
}

export async function sendTwoFactorResetEmail(
  to: string | null | undefined,
  resetBy: string | null | undefined,
): Promise<void> {
  if (!to) return;
  const { sendEmailCard } = await import("@/lib/emailCard").catch(() => ({ sendEmailCard: null }));
  if (!sendEmailCard) return;
  await sendEmailCard({
    to,
    subject: "Your two-factor sign-in was reset",
    badge: "Security",
    heading: "Two-factor sign-in reset",
    intro:
      "A Super Admin reset two-factor sign-in on your Destiny Church admin account. Next time you sign in you'll be asked to set up your authenticator app again and save new backup codes. If you didn't ask for this, tell a Super Admin.",
    rows: [
      ["Reset by", resetBy || "A Super Admin"],
      ["When", new Date().toLocaleString("en-GB", { timeZone: "Europe/London" })],
    ],
    ctaHref: SIGN_IN_URL,
    ctaLabel: "Sign in",
  }).catch((err) => console.error("❌ two-factor reset email failed:", err));
}
