// Cache tags for the data the root layout reads on every page.
//
// app/layout.tsx wraps each of those reads in `unstable_cache` with one of these
// tags. While a page is prerendered, the tags are collected onto the page itself,
// so expiring a tag throws away both the cached read and every page built from
// it. That is what lets the whole public site be served from the CDN while an
// admin's banner edit still shows up on the very next request.
//
// Every route that writes one of these tables must call `expireSiteCache` with
// the matching tag. Forgetting to is not dangerous — each read also has a short
// time-based `revalidate` as a backstop — but the edit will look like it didn't
// save for up to that long.

import "server-only";
import { revalidateTag } from "next/cache";

export const SITE_CACHE_TAGS = {
  /** site_banner, plus the alpha_events rows a course banner resolves against. */
  banner: "site-banner",
  /** site_popup. */
  popup: "site-popup",
  /** featured_event — the featured event and its event popup share one row. */
  featuredEvent: "featured-event",
  /** simulated_live. Real YouTube broadcasts are caught by the time backstop. */
  live: "live-status",
  /** service_status (Smart Search kill switch). */
  serviceStatus: "service-status",
} as const;

export type SiteCacheTag = (typeof SITE_CACHE_TAGS)[keyof typeof SITE_CACHE_TAGS];

/**
 * Expire a tag now, so the next request rebuilds rather than being served the
 * stale copy once more (which is what the default "max" profile would do).
 *
 * Swallows errors: revalidateTag throws outside a request scope (a one-off
 * script importing a writer, say), and a cache that expires on its own a few
 * minutes later is no reason to fail a write that already succeeded.
 */
export function expireSiteCache(...tags: SiteCacheTag[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (err) {
      console.warn(`⚠️ Could not expire cache tag "${tag}":`, err);
    }
  }
}
