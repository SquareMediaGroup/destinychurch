// Signed, short-lived preview links for unpublished posts.
//
// Token = "<expiry-seconds>.<hmac(postId:expiry)>". The page verifies it against
// the post it found by slug, so a token for one draft can't open another. Same
// secret-derivation as lib/trainingAccess.ts — no new env var to configure.
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const TTL_SECONDS = 60 * 60; // an hour: long enough to review, short enough to go stale if shared

function secret(): string {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY must be set to sign post previews");
  return key;
}

function sign(postId: string, exp: number): string {
  return createHmac("sha256", secret()).update(`post-preview:${postId}:${exp}`).digest("hex");
}

export function createPreviewToken(postId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + TTL_SECONDS;
  return `${exp}.${sign(postId, exp)}`;
}

export function verifyPreviewToken(postId: string, token: string | undefined, now = Date.now()): boolean {
  if (!token) return false;
  const [expRaw, mac] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || !mac || exp < Math.floor(now / 1000)) return false;
  const expected = Buffer.from(sign(postId, exp), "hex");
  const given = Buffer.from(mac, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
