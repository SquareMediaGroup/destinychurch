// Per-IP sliding-window rate limiter with escalating cooldowns. Extracted from
// the search route so it can be shared. In-memory and therefore per-instance on
// serverless — adequate for this site's volume; swap for a shared store (Redis/
// Supabase) if true distributed limiting is ever needed.
//
// Keys share one store, so callers should namespace them (e.g. `contact:${ip}`)
// to keep endpoints from tripping each other's limits.

const WINDOW_MS = 60_000; // 1-minute sliding window
const MAX_PER_WINDOW = 15; // requests allowed per window
const COOLDOWN_MS = [
  5 * 60_000, // 1st offense : 5 min
  10 * 60_000, // 2nd offense : 10 min
  20 * 60_000, // 3rd offense : 20 min
  40 * 60_000, // 4th offense : 40 min
  60 * 60_000, // 5th offense+: 60 min
];

interface RateLimitRecord {
  timestamps: number[];
  cooldownUntil: number;
  offenses: number;
}

const rlStore = new Map<string, RateLimitRecord>();

// Prune stale entries every 10 minutes to prevent memory creep.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const cutoff = Date.now() - 2 * 60 * 60_000;
    for (const [ip, r] of rlStore) {
      // Measured from the later of the last request and the end of the last
      // cooldown: an offense empties `timestamps`, so judging by timestamps
      // alone pruned the record (and its offense count) within ten minutes of
      // the cooldown ending, and every repeat offense got the 5-minute one.
      if (Math.max(r.cooldownUntil, r.timestamps.at(-1) ?? 0) < cutoff) {
        rlStore.delete(ip);
      }
    }
  }, 10 * 60_000);
}

// Accepts a Request/NextRequest or the Headers object from next/headers().
export function clientIp(source: { headers: Headers } | Headers): string {
  const headers = source instanceof Headers ? source : source.headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    headers.get("x-real-ip") ??
    "unknown"
  );
}

export interface RateLimitResult {
  /** True when the caller is in cooldown or just exceeded the window. */
  limited: boolean;
  /** Milliseconds until the cooldown ends (0 when not limited). */
  retryAfterMs: number;
}

/**
 * @param max Requests allowed per window before a cooldown starts. Defaults to
 * `MAX_PER_WINDOW` (15) for every existing caller. Raise it for an endpoint
 * where 15/minute is the wrong ceiling for what it's actually guarding against
 * — e.g. /api/track on a Sunday, where the whole congregation shares one
 * church WiFi NAT IP and the 16th seat-back tap must not read as abuse.
 */
export function checkRateLimit(ip: string, max: number = MAX_PER_WINDOW): RateLimitResult {
  const now = Date.now();
  let r = rlStore.get(ip);
  if (!r) {
    r = { timestamps: [], cooldownUntil: 0, offenses: 0 };
    rlStore.set(ip, r);
  }

  if (now < r.cooldownUntil) {
    return { limited: true, retryAfterMs: r.cooldownUntil - now };
  }

  r.timestamps = r.timestamps.filter((t) => now - t < WINDOW_MS);
  r.timestamps.push(now);

  if (r.timestamps.length > max) {
    r.offenses += 1;
    r.cooldownUntil = now + COOLDOWN_MS[Math.min(r.offenses - 1, COOLDOWN_MS.length - 1)];
    r.timestamps = [];
    return { limited: true, retryAfterMs: r.cooldownUntil - now };
  }

  return { limited: false, retryAfterMs: 0 };
}

// ── Shared across instances ─────────────────────────────────────────────────
// checkRateLimit above counts in this instance's memory, and on Vercel every
// serverless instance has its own count, so it slows a script down without
// capping it. For the public forms that send email, spend money or guard a
// password, sharedRateLimit also counts in the database (rate_limit_hit,
// migration 20261110_01), which every instance shares.

/**
 * A rate-limit key for something that identifies a person (an IP or email
 * address): hashed, so the counters table never holds one as typed.
 */
export async function limitKey(scope: string, subject: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(subject.trim().toLowerCase()));
  const hex = Array.from(new Uint8Array(bytes).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${scope}:${hex}`;
}

/**
 * True when the caller is over the limit: more than `max` hits for `key` in the
 * current window of `windowSeconds` (default a minute), counted across every
 * server instance.
 *
 * Two layers, as in lib/destinyOne/http.ts: this instance's memory first
 * (free, and it adds the escalating cooldowns) when the window is a minute,
 * then the database. If the database can't be reached, or hasn't had the
 * migration yet, the request is let through and the problem logged: a rate
 * limit must never be the reason a form stops working.
 */
export async function sharedRateLimit(key: string, max: number = MAX_PER_WINDOW, windowSeconds = 60): Promise<boolean> {
  if (windowSeconds === 60 && checkRateLimit(key, max).limited) return true;
  try {
    // Imported here, not at the top: this module is also loaded where the
    // service client isn't wanted (unit tests of the in-memory limiter).
    const { createServiceClient } = await import("@/utils/supabase/service");
    const { data, error } = await createServiceClient().rpc("rate_limit_hit", {
      p_key: key,
      p_max: max,
      p_window_seconds: windowSeconds,
    });
    if (error) {
      console.error("⚠️ Shared rate limit unavailable:", error.message);
      return false;
    }
    return data === false;
  } catch (err) {
    console.error("⚠️ Shared rate limit unavailable:", (err as Error).message);
    return false;
  }
}
