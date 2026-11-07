// Backup codes for two-factor sign-in: how they're made, typed and hashed.
// Kept apart from lib/twoFactor.server.ts (which needs a request) so it can
// be unit tested. Server code only: it uses node:crypto.
//
// 8 per admin, 16 random characters from a 31-letter alphabet (about 79
// bits), written XXXX-XXXX-XXXX-XXXX. Only a SHA-256 hash is stored.

import { createHash, randomInt } from "node:crypto";

export const BACKUP_CODE_COUNT = 8;

// No 0/O or 1/I/L, so a code read off paper can't be mistyped into another.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 16;

/** One new backup code, formatted for display. */
export function generateBackupCode(): string {
  let raw = "";
  for (let i = 0; i < CODE_LENGTH; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return raw.match(/.{4}/g)!.join("-");
}

/** What a typed code is compared as: case, spaces and dashes don't matter. */
export function normaliseBackupCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, "");
}

export function hashBackupCode(code: string): string {
  return createHash("sha256").update(`dc-admin-backup:${normaliseBackupCode(code)}`).digest("hex");
}

/** True when the input could be a backup code at all — saves a round trip on junk. */
export function looksLikeBackupCode(input: string): boolean {
  const n = normaliseBackupCode(input);
  return n.length === CODE_LENGTH && [...n].every((c) => ALPHABET.includes(c));
}

