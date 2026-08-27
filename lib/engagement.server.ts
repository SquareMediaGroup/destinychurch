// recordEngagement() — the one way anything gets into the engagement log.
//
// Called from the shortlink resolver (app/[slug]/page.tsx) and the public
// beacon (app/api/track/route.ts). Modelled closely on recordAudit() in
// lib/audit.server.ts, with the same first rule:
//
//   **It never throws.** A failed analytics write must never break the thing
//   the visitor was actually doing. Someone following a link off a flyer must
//   land on the sign-up form whether or not we managed to count them. Errors go
//   to the server log and the request carries on.
//
// One important difference from audit.server.ts: this module must NOT call
// `headers()` itself. It is invoked from inside `after()` in a Server
// Component, where Next throws on any request-time API — the values have to be
// read during render and handed in. readRequestContext() below is the piece
// that does the reading, and it is called at the call site, not here.

import "server-only";
import { createHash } from "node:crypto";
import { createServiceClient } from "@/utils/supabase/service";
import { detectBrowser, detectDevice, detectOs, isBot } from "@/lib/botDetect";
import { normaliseSrcTag, type EngagementSource } from "@/lib/engagement";

/**
 * Everything about the request, read from the headers while we still can.
 *
 * Deliberately a plain serialisable object: it crosses the boundary into an
 * `after()` callback by closure, so it must not hold a live Headers reference.
 */
export interface EngagementContext {
  country: string | null;
  region: string | null;
  city: string | null;
  referrerHost: string | null;
  referrerUrl: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  userAgent: string | null;
  isBot: boolean;
  ip: string | null;
  visitorHash: string | null;
  /**
   * True when the browser is speculatively fetching, not when a person decided
   * to go somewhere.
   *
   * Next prefetches any <Link> that scrolls into view, so without this every
   * hover over a link to a tracked slug would land as a click and the most
   * linked-to slug on the site would top the chart for no reason at all.
   * recordEngagement() drops these.
   */
  isPrefetch: boolean;
}

export interface EngagementInput extends Partial<EngagementContext> {
  source: EngagementSource;
  /** The redirect slug, the nfc_tiles id, or the /links href. */
  targetKey: string;
  /** The human name of it, captured now so a rename doesn't rewrite history. */
  targetLabel?: string | null;
  redirectId?: string | null;
  /** `?s=` — qr, nfc, print or social. Anything else is filed as direct. */
  srcTag?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
}

/**
 * Vercel's geolocation headers, which arrive on every request to a function.
 *
 * Middleware doesn't match `/[slug]` (see its `config.matcher`), so nothing has
 * read these before us — this is the only chance.
 */
const GEO_HEADERS = {
  country: "x-vercel-ip-country",
  region: "x-vercel-ip-country-region",
  city: "x-vercel-ip-city",
} as const;

/**
 * The salt for visitor_hash.
 *
 * Warned about rather than silently defaulted: an unsalted sha256 of an IPv4
 * address is reversible by brute force in seconds — the whole address space is
 * four billion hashes — so an unset salt would turn a column we describe as
 * pseudonymous into one that isn't.
 */
function hashSalt(): string {
  const salt = process.env.ANALYTICS_HASH_SALT;
  if (!salt) {
    console.warn(
      "⚠️ ANALYTICS_HASH_SALT is not set — visitor hashes are reversible. " +
        "Set it in the environment to make them pseudonymous.",
    );
    return "";
  }
  return salt;
}

/**
 * A stable, non-reversible id for "the same visitor".
 *
 * Outlives the raw IP on purpose: the nightly job nulls `ip` after 90 days, and
 * uniques are counted from this column so ageing the IP out doesn't
 * retroactively collapse last quarter's visitor numbers.
 */
function visitorHash(ip: string | null, userAgent: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256")
    .update(`${ip}|${userAgent ?? ""}|${hashSalt()}`)
    .digest("hex")
    .slice(0, 32);
}

/** The host of a referrer, for grouping. Junk values become null, not "". */
function referrerHost(referrer: string | null): string | null {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/** Postgres text columns are unbounded, but a 4KB user agent is still junk. */
function clamp(value: string | null, max: number): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

/**
 * Read everything we need off the request headers.
 *
 * MUST be called during render / inside the route handler — never from inside
 * an `after()` callback in a Server Component, where `headers()` throws.
 */
export function readRequestContext(headers: Headers): EngagementContext {
  const userAgent = clamp(headers.get("user-agent"), 512);

  // x-vercel-forwarded-for over x-forwarded-for: the plain one can be
  // overwritten by a proxy sitting above Vercel, the Vercel-prefixed one can't.
  const ip =
    clamp(headers.get("x-vercel-forwarded-for"), 64) ??
    clamp(headers.get("x-forwarded-for")?.split(",")[0] ?? null, 64) ??
    clamp(headers.get("x-real-ip"), 64);

  const referrerUrl = clamp(headers.get("referer"), 1024);

  // Non-ASCII city names arrive RFC3986-encoded ("Middlesbrough" is fine,
  // "Köln" arrives as "K%C3%B6ln"), so this has to be decoded or the page shows
  // percent escapes to an admin.
  let city = clamp(headers.get(GEO_HEADERS.city), 128);
  if (city) {
    try {
      city = decodeURIComponent(city);
    } catch {
      /* leave it as sent rather than losing the value entirely */
    }
  }

  return {
    country: clamp(headers.get(GEO_HEADERS.country), 8),
    region: clamp(headers.get(GEO_HEADERS.region), 8),
    city,
    referrerHost: referrerHost(referrerUrl),
    referrerUrl,
    device: detectDevice(userAgent),
    os: detectOs(userAgent),
    browser: detectBrowser(userAgent),
    userAgent,
    isBot: isBot(userAgent),
    ip,
    visitorHash: visitorHash(ip, userAgent),
    // Three spellings because they come from three places: Next's own router
    // sets the first, the HTML spec's speculation rules set `sec-purpose`, and
    // older Chrome sends `purpose: prefetch`.
    isPrefetch:
      headers.get("next-router-prefetch") === "1" ||
      headers.get("purpose") === "prefetch" ||
      (headers.get("sec-purpose") ?? "").includes("prefetch"),
  };
}

/**
 * Write one event. Fire-and-forget: nothing it does can fail the request, and
 * callers are expected to invoke it from inside `after()` so the visitor never
 * waits on the insert.
 */
export async function recordEngagement(input: EngagementInput): Promise<void> {
  try {
    // A prefetch is the browser being helpful, not a person choosing to go
    // somewhere. Counting it would inflate every slug this site links to.
    if (input.isPrefetch) return;

    const { error } = await createServiceClient()
      .from("engagement_events")
      .insert({
        source: input.source,
        target_key: clamp(input.targetKey, 256),
        target_label: clamp(input.targetLabel ?? null, 256),
        redirect_id: input.redirectId ?? null,

        country: input.country ?? null,
        region: input.region ?? null,
        city: input.city ?? null,
        referrer_host: input.referrerHost ?? null,
        referrer_url: input.referrerUrl ?? null,
        utm_source: clamp(input.utmSource ?? null, 128),
        utm_medium: clamp(input.utmMedium ?? null, 128),
        utm_campaign: clamp(input.utmCampaign ?? null, 128),
        src_tag: normaliseSrcTag(input.srcTag),

        device: input.device ?? null,
        os: input.os ?? null,
        browser: input.browser ?? null,
        user_agent: input.userAgent ?? null,
        is_bot: input.isBot ?? false,

        ip: input.ip ?? null,
        visitor_hash: input.visitorHash ?? null,
      });

    if (error) {
      // By far the likeliest cause is the migration not having been applied,
      // so name the file rather than just saying the insert failed.
      console.error(
        "⚠️ Engagement write failed (engagement_events):",
        error.message,
        "— has supabase/migrations/20260827_engagement_events.sql been run?",
      );
    }
  } catch (err) {
    console.error("⚠️ Engagement write threw:", err);
  }
}

/**
 * Pull the `?s=` tag and any UTM parameters off a resolved searchParams object.
 *
 * Next hands these through as `string | string[] | undefined`; a repeated
 * parameter takes its first value rather than being dropped.
 */
export function readCampaignParams(
  params: Record<string, string | string[] | undefined> | undefined,
): Pick<EngagementInput, "srcTag" | "utmSource" | "utmMedium" | "utmCampaign"> {
  const one = (value: string | string[] | undefined): string | null =>
    Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

  return {
    srcTag: one(params?.s),
    utmSource: one(params?.utm_source),
    utmMedium: one(params?.utm_medium),
    utmCampaign: one(params?.utm_campaign),
  };
}
