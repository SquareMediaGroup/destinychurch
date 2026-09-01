// Server-only password hashing + unlock-cookie helpers for /media board
// passwords. Same scrypt + HMAC-signed-cookie approach as lib/trainingAccess.ts
// (kept as a separate file rather than shared, since /media's cookie is scoped
// per-board-id across several route shapes — /media/b/[slug], /media/s/[token],
// and the API routes — rather than one static path prefix like /training has).
import "server-only";

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "crypto";
import { cookies } from "next/headers";

const KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

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

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret(): string {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY must be set to sign unlock cookies");
  }
  return key;
}

export function unlockCookieName(boardId: string): string {
  return `mb_${boardId}`;
}

export function signUnlock(boardId: string): string {
  return createHmac("sha256", secret()).update(boardId).digest("hex");
}

function verifyUnlock(boardId: string, token: string | undefined): boolean {
  if (!token) return false;
  const expected = signUnlock(boardId);
  try {
    const a = Buffer.from(token, "hex");
    const b = Buffer.from(expected, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Cookie path is site-wide: unlike /training's single path prefix, a board's
 *  content is reachable from more than one route shape (/media/b/[slug],
 *  /media/s/[token], the API routes), so uniqueness comes entirely from the
 *  board-id-scoped cookie name rather than the path. */
export const UNLOCK_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
};

/** Whether the current request already unlocked this board. */
export async function isBoardUnlocked(boardId: string): Promise<boolean> {
  const jar = await cookies();
  return verifyUnlock(boardId, jar.get(unlockCookieName(boardId))?.value);
}
