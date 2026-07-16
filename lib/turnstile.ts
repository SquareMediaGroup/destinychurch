import { createHmac, timingSafeEqual } from "crypto";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// How long a Smart Search "verified" cookie stays valid before Turnstile
// must run again.
export const TURNSTILE_SESSION_TTL_MS = 30 * 60 * 1000;

export async function verifyTurnstileToken(token: string | null | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn("[turnstile] TURNSTILE_SECRET_KEY is not set — failing closed");
    return false;
  }
  if (!token) return false;

  try {
    const params = new URLSearchParams({ secret, response: token });
    if (ip && ip !== "unknown") params.set("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!res.ok) return false;

    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error("[turnstile] verification request failed", err);
    return false;
  }
}

function hmac(value: string): string {
  const secret = process.env.TURNSTILE_COOKIE_SECRET ?? "";
  return createHmac("sha256", secret).update(value).digest("hex");
}

/** Produces a signed cookie value proving Turnstile was recently verified. */
export function signVerifiedCookie(): string {
  const ts = Date.now().toString();
  return `${ts}.${hmac(ts)}`;
}

export function isVerifiedCookieValid(value: string | undefined | null): boolean {
  if (!value || !process.env.TURNSTILE_COOKIE_SECRET) return false;

  const [ts, sig] = value.split(".");
  if (!ts || !sig) return false;

  const expected = hmac(ts);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;

  const age = Date.now() - Number(ts);
  return age >= 0 && age <= TURNSTILE_SESSION_TTL_MS;
}
