import { test, expect } from "@playwright/test";
import { signedUrlExpiresAt, signedUrlNeedsRefresh } from "../../packages/shared/src/destinyOne/signedUrls";

/**
 * Destiny One caches messages for up to 30 days, but their attachment links
 * (Supabase signed URLs) last an hour. The app reads each link's expiry from
 * its token to know when to ask for a fresh one.
 */

const b64url = (s: string) => Buffer.from(s).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const signed = (payload: object) =>
  `https://x.supabase.co/storage/v1/object/sign/d1-chat-media/g/a?token=${b64url('{"alg":"HS256"}')}.${b64url(JSON.stringify(payload))}.sig`;

test.describe("signed URL expiry", () => {
  test("reads exp from the token, in milliseconds", () => {
    expect(signedUrlExpiresAt(signed({ url: "d1-chat-media/g/a", exp: 1_900_000_000 }))).toBe(1_900_000_000_000);
  });

  test("anything that isn't a readable signed URL gives null", () => {
    expect(signedUrlExpiresAt(null)).toBeNull();
    expect(signedUrlExpiresAt("https://example.org/photo.jpg")).toBeNull();
    expect(signedUrlExpiresAt("https://x/sign/a?token=not-a-jwt")).toBeNull();
    expect(signedUrlExpiresAt(signed({ url: "no exp" }))).toBeNull();
  });

  test("needs a refresh once expired, or within the margin", () => {
    const now = 1_900_000_000_000;
    expect(signedUrlNeedsRefresh(signed({ exp: now / 1000 - 1 }), now)).toBe(true);
    expect(signedUrlNeedsRefresh(signed({ exp: now / 1000 + 60 }), now)).toBe(true); // inside 5 minutes
    expect(signedUrlNeedsRefresh(signed({ exp: now / 1000 + 3600 }), now)).toBe(false);
  });

  test("an unreadable link is left alone", () => {
    expect(signedUrlNeedsRefresh("https://example.org/photo.jpg")).toBe(false);
    expect(signedUrlNeedsRefresh(null)).toBe(false);
  });
});
