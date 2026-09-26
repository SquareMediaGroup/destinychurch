// Signing in. Two ways, and no phone number in either (safeguarding rule):
//
//   Email      — Supabase sends a one-time code; the member types it in.
//   ChurchSuite — for staff and leaders with a ChurchSuite login. Opens
//                 ChurchSuite's sign-in in an auth session, and finishes with
//                 app-side PKCE so an intercepted redirect is useless.
//
// After either, call api.link(): the server matches the account to the
// church's ChurchSuite records and returns the member. A `pending` status is
// the normal outcome when the church can't yet tell who this is — show
// "we'll be in touch", not an error.

import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import type { D1Me } from "@destiny/shared";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { unregisterPush } from "@/lib/push";

WebBrowser.maybeCompleteAuthSession();

// ── Email one-time code ─────────────────────────────────────────────────────

export async function requestEmailCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, code: string): Promise<D1Me> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim().toLowerCase(),
    token: code.trim(),
    type: "email",
  });
  if (error) throw error;
  return api.link();
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
  const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (otpError) return { kind: "failed", reason: otpError.message };

  return { kind: "signed-in", me: await api.link() };
}

// ── Sign out ────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await unregisterPush().catch(() => undefined);
  await supabase.removeAllChannels();
  await supabase.auth.signOut();
}
