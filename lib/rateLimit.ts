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
      if (r.cooldownUntil < Date.now() && (r.timestamps.at(-1) ?? 0) < cutoff) {
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
