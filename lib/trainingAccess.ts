// Server-only password hashing + unlock-cookie helpers for the Training module.
// Passwords are NEVER stored or compared in plain text.
import "server-only";

import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from "crypto";
import { cookies } from "next/headers";

const KEYLEN = 64;

// Hash a plain password as "<saltHex>:<hashHex>" using scrypt + a random salt.
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

// Constant-time verify of a plain password against a stored "salt:hash".
export function verifyPassword(plain: string, stored: string | null): boolean {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(plain, salt, expected.length || KEYLEN);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

// ── Unlock cookie ─────────────────────────────────────────────────────────
// A successful password entry sets an HMAC-signed cookie scoped to one
// sub-group. The HMAC key is the existing server secret — never shipped to the
// client — so the cookie cannot be forged.

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || "training-unlock-fallback";
}

export function unlockCookieName(subgroupId: string): string {
  return `tg_${subgroupId}`;
}

export function signUnlock(subgroupId: string): string {
  return createHmac("sha256", secret()).update(subgroupId).digest("hex");
}

export function verifyUnlock(subgroupId: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = signUnlock(subgroupId);
  try {
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Read the request cookies and report whether this sub-group is unlocked.
export async function isUnlocked(subgroupId: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(unlockCookieName(subgroupId))?.value;
  return verifyUnlock(subgroupId, token);
}

export const UNLOCK_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/training",
  maxAge: COOKIE_MAX_AGE,
};
