// Signing in. Two ways, and no phone number in either (safeguarding rule):
//
//   Email      — Supabase sends a one-time code; the member types it in.
//   ChurchSuite — for staff and leaders with a ChurchSuite login. Opens
//                 ChurchSuite's sign-in in an auth session, and finishes with
//                 app-side PKCE so an intercepted redirect is useless.
//
// Both sign into signInClient(): the active account's client, or during
// "Add account" a new one (src/lib/accounts.ts), so the account you're on
// stays untouched until the new one is in.
//
// After either, call link(): the server matches the account to the
// church's ChurchSuite records and returns the member. A `pending` status is
// the normal outcome when the church can't yet tell who this is — show
// "we'll be in touch", not an error.

import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { SIGN_IN_FAILED, passwordRejection, validateNewPassword, type D1Me, type PasswordRejection } from "@destiny/shared";
import { client, signInClient } from "@/lib/accounts";
import { api, signInApi } from "@/lib/api";
import { unregisterPush } from "@/lib/push";

WebBrowser.maybeCompleteAuthSession();

// ── Email one-time code ─────────────────────────────────────────────────────

/**
 * Asks the server to send a code. It only sends one if this email can get in
 * (a member, an invite, or requests are open), and answers the same either
 * way, so the app never learns (or shows) whether an email belongs to anyone.
 */
export async function requestEmailCode(email: string): Promise<void> {
  await api.requestCode(email.trim().toLowerCase());
}

export async function verifyEmailCode(email: string, code: string): Promise<D1Me> {
  const { error } = await signInClient().auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: "email",
  });
  if (error) throw error;
  return signInApi.link();
}

// ── Password ────────────────────────────────────────────────────────────────

/**
 * Password sign-in. Every failure (no such email, wrong password, an account
 * that can't sign in) says the same thing, so the app never reveals who is a member.
 * Approval, invite-only and suspension are still decided by api.link().
 */
export async function signInWithPassword(email: string, password: string): Promise<{ me: D1Me; leaked: boolean }> {
  const { data, error } = await signInClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error(SIGN_IN_FAILED);
  // With leaked password protection on, Supabase still lets an existing password
  // sign in but flags it if it has since turned up in a data breach.
  const leaked = !!data.weakPassword?.reasons.includes("pwned");
  return { me: await signInApi.link(), leaked };
}

/** Supabase refused the new password: too weak, or found in a data breach (leaked password protection). */
export class PasswordRejectedError extends Error {
  constructor(readonly rejection: PasswordRejection) {
    super(rejection.title);
    this.name = "PasswordRejectedError";
  }
}

/** Whether the signed-in account already has a password (so changing it needs the current one). */
export async function hasPassword(): Promise<boolean> {
  return (await api.hasPassword()).hasPassword;
}

/**
 * Face ID / Touch ID / passcode, for setting a first password. An account that
 * signs in by emailed code has no password to prove it's you, so the phone
 * has to. Unlike confirmOwner (account switching) this does not wave people
 * through when the device has no lock: setting a password on an unlocked
 * phone is exactly what this is here to stop.
 */
export async function confirmDeviceOwner(): Promise<"ok" | "cancelled" | "no-lock"> {
  const level = await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE);
  if (level === LocalAuthentication.SecurityLevel.NONE) return "no-lock";
  const result = await LocalAuthentication.authenticateAsync({ promptMessage: "Confirm it's you to set a password", disableDeviceFallback: false });
  return result.success ? "ok" : "cancelled";
}

/**
 * Set or change the signed-in account's password. `current` is required when
 * the account already has one; the server checks it (it can't be skipped here).
 */
export async function setPassword(password: string, current?: string): Promise<void> {
  const { data } = await client().auth.getSession();
  const problem = validateNewPassword(password, data.session?.user.email ?? null);
  if (problem) throw new Error(problem);
  try {
    await api.changePassword(password, current);
  } catch (err) {
    const match = err instanceof Error ? /^password_rejected:(.*)$/.exec(err.message) : null;
    if (match) throw new PasswordRejectedError(passwordRejection(match[1].split(",").filter(Boolean)));
    throw err;
  }
  // The server changed it; refresh so this session carries on with the new credentials.
  await client().auth.refreshSession().catch(() => undefined);
}

// ── Changing your email ─────────────────────────────────────────────────────

/** Emails a code to the new address. Returns the ticket confirmEmailChange needs. */
export async function startEmailChange(email: string): Promise<string> {
  const { ticket } = await api.startEmailChange(email.trim().toLowerCase());
  return ticket;
}

/**
 * Checks the code and changes the sign-in email on the server, then refreshes
 * the session so the new address shows here (and in the account switcher).
 */
export async function confirmEmailChange(ticket: string, code: string): Promise<void> {
  await api.confirmEmailChange(ticket, code.trim());
  await client().auth.refreshSession().catch(() => undefined);
}

// ── Sign in with ChurchSuite ────────────────────────────────────────────────

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function base64url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    const chars = [n >> 18, (n >> 12) & 63, (n >> 6) & 63, n & 63].map((c) => BASE64URL[c]);
    out += chars.slice(0, i + 2 < bytes.length ? 4 : i + 1 < bytes.length ? 3 : 2).join("");
  }
  return out;
}

export type ChurchSuiteResult =
  | { kind: "signed-in"; me: D1Me }
  | { kind: "cancelled" }
  | { kind: "failed"; reason: string };

export async function signInWithChurchSuite(): Promise<ChurchSuiteResult> {
  const verifier = base64url(Crypto.getRandomBytes(32));
  const challenge = base64url(new Uint8Array(await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, new TextEncoder().encode(verifier))));
  const redirect = Linking.createURL("auth");

  const result = await WebBrowser.openAuthSessionAsync(api.churchSuiteStartUrl(redirect, challenge), redirect);
  if (result.type !== "success") return { kind: "cancelled" };

  const params = Linking.parse(result.url).queryParams ?? {};
  const error = typeof params.error === "string" ? params.error : null;
  if (error) return error === "cancelled" ? { kind: "cancelled" } : { kind: "failed", reason: error };
  const code = typeof params.code === "string" ? params.code : null;
  if (!code) return { kind: "failed", reason: "no_code" };

  const { tokenHash, type } = await api.exchangeChurchSuiteCode(code, verifier);
  const { error: otpError } = await signInClient().auth.verifyOtp({ token_hash: tokenHash, type });
  if (otpError) return { kind: "failed", reason: otpError.message };

  return { kind: "signed-in", me: await signInApi.link() };
}

// ── Sign out ────────────────────────────────────────────────────────────────

/** Signs the active account out everywhere. accounts.removeAccount forgets it on this device. */
export async function signOut(): Promise<void> {
  await unregisterPush().catch(() => undefined);
  await client().removeAllChannels();
  await client().auth.signOut();
}
