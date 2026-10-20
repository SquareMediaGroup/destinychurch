// Signed, expiring preview links for unpublished posts.
//
// Token = "<expiry-seconds>.<hmac(postId:version:expiry)>". The page verifies it
// against the post it found by slug, so a token for one draft can't open
// another. Same secret-derivation as lib/trainingAccess.ts — no new env var to
// configure.
//
// Two lifetimes share the format:
//   • a preview (an hour) — the editor's own Preview button, long enough to
//     check your work, short enough to go stale if the URL is pasted somewhere;
//   • a review link (7 days) — sent to someone else for sign-off.
// Both are signed with the post's `review_link_version`, so "Turn off review
// links" (which bumps it) revokes every outstanding link for that post at once.
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export const PREVIEW_TTL_SECONDS = 60 * 60;
export const REVIEW_TTL_SECONDS = 7 * 24 * 60 * 60;

function secret(): string {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY must be set to sign post previews");
  return key;
}

function sign(postId: string, version: number, exp: number): string {
  return createHmac("sha256", secret()).update(`post-preview:${postId}:${version}:${exp}`).digest("hex");
}

export function createPreviewToken(
  postId: string,
  { version = 0, ttlSeconds = PREVIEW_TTL_SECONDS, now = Date.now() } = {},
): { token: string; expiresAt: Date } {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return { token: `${exp}.${sign(postId, version, exp)}`, expiresAt: new Date(exp * 1000) };
}

export function verifyPreviewToken(
  postId: string,
  token: string | undefined,
  { version = 0, now = Date.now() } = {},
): boolean {
  if (!token) return false;
  const [expRaw, mac] = token.split(".");
  const exp = Number(expRaw);
  if (!Number.isInteger(exp) || !mac || exp < Math.floor(now / 1000)) return false;
  const expected = Buffer.from(sign(postId, version, exp), "hex");
  const given = Buffer.from(mac, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
