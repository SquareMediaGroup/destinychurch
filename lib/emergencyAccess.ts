// Break-glass sign-in for when the normal sign-in service is down.
//
// Configured entirely by environment variables, never in code:
//
//   EMERGENCY_LOGIN_EMAIL          the address to type on /login
//   EMERGENCY_LOGIN_PASSWORD_HASH  from `node scripts/emergency-login-hash.mjs`
//   EMERGENCY_SESSION_SECRET       32+ random characters; signs the session cookie
//
// Missing any of the three switches the feature off. app/login/actions.ts only
// tries it when sign-in itself can't be reached, so it can't be used to skip
// the normal sign-in while that works.
//
// The session it creates opens one page, /emergency (live service status and
// what to do), and nothing else: every admin page reads and writes the same
// database that is down, so a wider session would open a dashboard where
// nothing loads, at the cost of an admin login that no database row controls.
//
// Web Crypto only, so middleware can verify the cookie in any runtime.

export const EMERGENCY_COOKIE = "dc-emergency";
export const EMERGENCY_SESSION_SECONDS = 8 * 60 * 60;

const encoder = new TextEncoder();

function secret(): string | null {
  const value = process.env.EMERGENCY_SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}

export function isEmergencyLoginConfigured(): boolean {
  return Boolean(
    process.env.EMERGENCY_LOGIN_EMAIL && process.env.EMERGENCY_LOGIN_PASSWORD_HASH && secret(),
  );
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const byte of array) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(payload)));
}

/** Constant-time string comparison, so the signature can't be guessed byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createEmergencyToken(email: string, now = Date.now()): Promise<string> {
  const key = secret();
  if (!key) throw new Error("EMERGENCY_SESSION_SECRET is not set");
  const expires = Math.floor(now / 1000) + EMERGENCY_SESSION_SECONDS;
  const payload = toBase64Url(encoder.encode(JSON.stringify({ email, expires })));
  return `${payload}.${await sign(payload, key)}`;
}

/** The session's email when the cookie is genuine and unexpired, otherwise null. */
export async function verifyEmergencyToken(
  token: string | undefined,
  now = Date.now(),
): Promise<{ email: string } | null> {
  const key = secret();
  if (!key || !token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!safeEqual(signature, await sign(payload, key))) return null;
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const { email, expires } = JSON.parse(json) as { email?: unknown; expires?: unknown };
    if (typeof email !== "string" || typeof expires !== "number") return null;
    if (expires * 1000 <= now) return null;
    return { email };
  } catch {
    return null;
  }
}
