// Supabase Storage signed URLs carry their own expiry: `…/object/sign/<bucket>/
// <path>?token=<JWT>`, whose payload has `exp` (seconds since 1970). The app
// keeps messages for up to 30 days but their attachment links only last an
// hour, so it reads the expiry here and asks for fresh links before showing a
// broken photo or opening a dead PDF link.

/** When a Supabase signed URL stops working, in ms since 1970, or null if it isn't one we can read. */
export function signedUrlExpiresAt(url: string | null | undefined): number | null {
  if (!url) return null;
  const token = /[?&]token=([^&#]+)/.exec(url)?.[1];
  const payload = token?.split(".")[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "=");
    const exp = (JSON.parse(atob(base64)) as { exp?: unknown }).exp;
    return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * True when the link has expired or will within `marginMs` (default 5
 * minutes, so a photo doesn't fail mid-load). Links we can't read are treated
 * as fine: the server decides, and a broken one is re-fetched on the next page.
 */
export function signedUrlNeedsRefresh(url: string | null | undefined, now = Date.now(), marginMs = 5 * 60_000): boolean {
  const exp = signedUrlExpiresAt(url);
  return exp !== null && exp - marginMs <= now;
}
