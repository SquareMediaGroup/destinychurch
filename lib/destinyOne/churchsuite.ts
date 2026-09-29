// Destiny One — the pure half of the ChurchSuite integration: turning raw API
// records into the little we keep, and the PKCE/state helpers for "Sign in
// with ChurchSuite". No network, no secrets, so it's unit-tested directly
// (tests/unit/destiny-one-churchsuite.spec.ts). The network half is
// churchsuite.server.ts.
//
// Data minimisation is enforced HERE, by allow-list. A ChurchSuite contact
// carries mobile, telephone, address, spouse, custom fields; a child record
// carries medical and additional-needs notes. None of that has any business in
// the app's infrastructure, and "no phone numbers" is a safeguarding rule, not
// just tidiness. So nothing leaves toPerson() except the fields in CsPerson,
// and the date of birth leaves only as the date its owner turns 18.

import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { adultOnFromDateOfBirth } from "@destiny/shared";

export type CsKind = "contact" | "child";
export type CsStatus = "active" | "archived" | "pending";

/** Everything Destiny One ever keeps from a ChurchSuite person record. */
export interface CsPerson {
  kind: CsKind;
  id: number;
  displayName: string;
  /** Lower-cased. Used only to confirm a match, never stored or shown. */
  email: string | null;
  /**
   * The 18th birthday. Always null for Children-module records: ChurchSuite
   * keeps minors there, and docs/mobile-app-scope.md A.3 treats anyone only in
   * that module as a minor by default.
   */
  adultOn: string | null;
  status: CsStatus;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function toPerson(raw: unknown, kind: CsKind): CsPerson | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "number" ? r.id : Number(r.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  const name = [str(r.first_name), str(r.last_name)].filter(Boolean).join(" ") || str(r.formal_name);
  if (!name) return null;

  const status = r.status === "archived" || r.status === "pending" ? r.status : "active";

  return {
    kind,
    id,
    displayName: name.slice(0, 120),
    email: str(r.email)?.toLowerCase() ?? null,
    adultOn: kind === "contact" ? adultOnFromDateOfBirth(str(r.date_of_birth)) : null,
    status,
  };
}

/**
 * Picks the one record an email address belongs to.
 *
 * Families often share an address across a parent's contact and a child's
 * record, and ChurchSuite's `q` is a fuzzy match, so: exact match only, active
 * only, and more than one hit is "ambiguous" — which leaves the account
 * pending for a safeguarding admin to link by hand rather than guessing who is
 * holding the phone.
 */
export function pickByEmail(
  people: readonly CsPerson[],
  email: string,
): { kind: "match"; person: CsPerson } | { kind: "none" } | { kind: "ambiguous"; count: number } {
  const target = email.trim().toLowerCase();
  const hits = people.filter((p) => p.email === target && p.status === "active");
  if (hits.length === 0) return { kind: "none" };
  if (hits.length > 1) return { kind: "ambiguous", count: hits.length };
  return { kind: "match", person: hits[0] };
}

// ── Sign in with ChurchSuite (OAuth 2 authorisation code + PKCE) ────────────

export function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function createState(): string {
  return base64url(randomBytes(24));
}

export function challengeFor(verifier: string): string {
  return base64url(createHash("sha256").update(verifier).digest());
}

/** Constant-time check that `verifier` hashes to `challenge` (S256). */
export function verifierMatches(verifier: string, challenge: string): boolean {
  const a = Buffer.from(challengeFor(verifier));
  const b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Seals a small JSON payload (AES-256-GCM, key derived from DESTINY_ONE_SECRET)
 * so it can travel through the browser — the OAuth state cookie, and the
 * one-time code handed back to the app — without being readable or forgeable.
 * `ttlSeconds` is baked in; unseal() refuses anything past it.
 */
export function seal(payload: Record<string, unknown>, secret: string, ttlSeconds: number): string {
  const key = createHash("sha256").update(`destiny-one:${secret}`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plain = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlSeconds * 1000 }));
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return base64url(Buffer.concat([iv, cipher.getAuthTag(), body]));
}

export function unseal<T extends Record<string, unknown>>(token: string, secret: string): T | null {
  try {
    const raw = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    if (raw.length < 29) return null;
    const key = createHash("sha256").update(`destiny-one:${secret}`).digest();
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const plain = Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
    const parsed = JSON.parse(plain.toString("utf8")) as T & { exp?: number };
    if (typeof parsed.exp !== "number" || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Where the app wants to land after sign-in. Only the app's own scheme (and,
 * in development, Expo Go's exp:// links) — anything else would turn the
 * callback into an open redirect that hands a sign-in token to a stranger.
 */
export function isAllowedAppRedirect(uri: string, allowDev = false): boolean {
  if (/^destinyone:\/\/[a-z0-9/_-]*$/i.test(uri)) return true;
  if (allowDev && /^exp:\/\/[a-z0-9.:-]+(\/--\/[a-z0-9/_-]*)?$/i.test(uri)) return true;
  return false;
}
