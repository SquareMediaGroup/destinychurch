// App BFF plumbing — the response envelope every `/api/app/v1/*` route returns.
//
// Why an envelope at all: the iOS app is native Swift and cannot import
// `@destiny/shared`, so it has no way to normalise anything itself. Everything
// the client would otherwise have to reason about — whether a feed is healthy,
// what copy to show when it isn't, whether a URL is absolute — is settled here
// and shipped as plain JSON. See docs/mobile-app-scope.md §5.3.

import { NextResponse } from "next/server";

/** The app-facing API version. Bump the route directory, not this, on a break. */
export const APP_API_VERSION = 1;

export type FeedStatus = "ok" | "degraded";

export type AppEnvelope<T> = {
  status: FeedStatus;
  /** RFC3339 UTC — lets the app show "updated 5 minutes ago" on cached data. */
  generatedAt: string;
  data: T;
  /**
   * Copy the app renders verbatim in its degraded banner. Null when `ok`.
   * Kept server-side so the wording can change without an App Store release.
   */
  notice: string | null;
};

/**
 * The site's public origin, used to absolutise every URL the app receives.
 *
 * The app deliberately has no URL-joining logic: if a client ever needs to
 * build a URL from a fragment, that is a bug here, not there.
 *
 * This must be the origin that actually serves *this* app, which is not the
 * same as the church's public domain. `destinytees.uk` is currently an nginx
 * site; the Next.js app runs on Vercel, so hardcoding the former made every
 * emitted URL — thumbnail proxy, event page, .ics — 404 for app clients.
 *
 * Resolution order, so this self-corrects rather than needing a code change
 * when the domain moves:
 *  1. `NEXT_PUBLIC_SITE_URL`, if someone sets it explicitly.
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — the project's primary production
 *     domain. This follows the domain automatically once `destinytees.uk` is
 *     pointed at Vercel.
 *  3. The Vercel domain, as a last-resort literal.
 */
function resolveSiteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercelDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelDomain) return `https://${vercelDomain.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return "https://destinychurch.vercel.app";
}

export const SITE_ORIGIN = resolveSiteOrigin();

/** Absolutise a site-relative path. Already-absolute URLs pass through. */
export function absolute(path: string): string;
export function absolute(path: string | null | undefined): string | null;
export function absolute(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  // Protocol-relative URLs would otherwise slip through as a path.
  if (path.startsWith("//")) return `https:${path}`;
  return `${SITE_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Build an app API response.
 *
 * A degraded response deliberately overrides the caller's cache header down to
 * 30 seconds: a ChurchSuite blip pinned in the edge cache for the full 5-minute
 * TTL turns a momentary outage into a five-minute one for every user.
 */
export function appJson<T>(
  data: T,
  opts: {
    cacheControl: string;
    status?: FeedStatus;
    notice?: string | null;
  },
): NextResponse {
  const status = opts.status ?? "ok";
  const body: AppEnvelope<T> = {
    status,
    generatedAt: new Date().toISOString(),
    data,
    notice: status === "degraded" ? (opts.notice ?? null) : null,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control":
        status === "degraded"
          ? "public, s-maxage=30, stale-while-revalidate=60"
          : opts.cacheControl,
      "X-App-Api-Version": String(APP_API_VERSION),
    },
  });
}

/**
 * Dev-only state simulation: `?simulate=degraded|empty|error`.
 *
 * Without this the app's degraded and empty states cannot be exercised against
 * a real server, which means they get screenshotted never and ship broken.
 * Hard-disabled in production so it can't become an availability lever.
 */
export type SimulatedState = "degraded" | "empty" | "error" | null;

export function simulatedState(request: Request): SimulatedState {
  if (process.env.NODE_ENV === "production") return null;
  const value = new URL(request.url).searchParams.get("simulate");
  return value === "degraded" || value === "empty" || value === "error"
    ? value
    : null;
}

/** Standard degraded copy, so every surface sounds like the same app. */
export const DEGRADED_NOTICE = {
  events: "Event information is temporarily unavailable. Please try again shortly.",
  sermons: "Sermons are temporarily unavailable. Please try again shortly.",
  podcast: "The podcast feed is temporarily unavailable. Please try again shortly.",
  live: "We can't check the live stream right now. Please try again shortly.",
  home: "Some content is temporarily unavailable. Please try again shortly.",
} as const;
