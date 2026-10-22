import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Checks a password against EMERGENCY_LOGIN_PASSWORD_HASH (see
// lib/emergencyAccess.ts). The hash is `scrypt:<salt hex>:<key hex>`, made by
// scripts/emergency-login-hash.mjs; keep the two in step.

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export async function verifyEmergencyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
