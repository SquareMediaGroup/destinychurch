// Server-only event lookups: the ChurchSuite index, and the featured event
// that /whats-on, the homepage carousel and the event popup all read.
import "server-only";
import { unstable_noStore as noStore } from "next/cache";
import {
  buildEventIndex,
  eventDescriptionText,
  eventImage,
  eventSignupUrl,
  fetchChurchSuiteEvents,
  lastOccurrenceEnd,
  parseFeedDate,
  type EventIndex,
  type EventSeries,
} from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { RESERVED_EVENT_SLUGS } from "@/lib/events";

/**
 * Every upcoming event, grouped into series with stable slugs.
 *
 * `fetchChurchSuiteEvents` returns [] on any error, so an empty index is also
 * the degraded state — callers must render an empty state rather than throw.
 */
export async function getEventIndex(): Promise<EventIndex> {
  const events = await fetchChurchSuiteEvents({ next: { revalidate: 300 } });
  return buildEventIndex(events, { reservedSlugs: RESERVED_EVENT_SLUGS });
}

/** The `featured_event` singleton row, as stored. */
export type FeaturedEventRow = {
  event_identifier: string | null;
  event_sequence: number | null;
  event_id: number | null;
  event_name: string | null;
  event_slug: string | null;
  event_ends_at: string | null;
  active: boolean;
  promote_from: string | null;
  promote_until: string | null;
  headline: string | null;
  blurb: string | null;
  image_url: string | null;
  image_path: string | null;
  cta_text: string | null;
  cta_link: string | null;
  popup_active: boolean;
  popup_title: string | null;
  popup_body: string | null;
  popup_image_url: string | null;
  popup_image_path: string | null;
  popup_cta_text: string | null;
  popup_cta_link: string | null;
  updated_at: string | null;
};

/** Overrides merged over feed data — what the hero and popup actually render. */
export type ResolvedFeaturedEvent = {
  slug: string;
  identifier: string | null;
  headline: string;
  blurb: string;
  imageUrl: string | null;
  ctaText: string;
  ctaLink: string;
  dateLine: string | null;
  locationName: string | null;
  /** Null when the feed is down and we are rendering from stored copy alone. */
  series: EventSeries | null;
  updatedAt: string | null;
};

export type ResolvedEventPopup = {
  eventSlug: string;
  identifier: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaText: string;
  ctaLink: string;
  updatedAt: string | null;
};

const EMPTY = (value: string | null | undefined): boolean =>
  !value || value.trim().length === 0;

async function readFeaturedRow(): Promise<FeaturedEventRow | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("featured_event")
      .select("*")
      .eq("id", 1)
      .maybeSingle();
    return (data as FeaturedEventRow | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Is the promotion live right now?
 *
 * Auto-expiry is mostly free: the ChurchSuite feed is forward-only, so a
 * finished event simply stops appearing and `series` goes null. The explicit
 * `lastOccurrenceEnd` check covers the gap between the last session ending and
 * the feed dropping it.
 */
function isWithinWindow(row: FeaturedEventRow, now: number): boolean {
  if (!row.active || !row.event_identifier) return false;
  if (row.promote_from && now < Date.parse(row.promote_from)) return false;
  if (row.promote_until && now > Date.parse(row.promote_until)) return false;
  return true;
}

/**
 * Resolve the featured event, merging admin overrides over the live feed.
 *
 * The feed-outage case matters: `fetchChurchSuiteEvents` returns [] on *any*
 * error, which would otherwise silently un-feature the event for five minutes
 * every time ChurchSuite hiccups. When the feed is empty but the stored copy is
 * complete and the event has not ended, we render from the snapshot instead.
 */
export async function getFeaturedEvent(
  index?: EventIndex,
): Promise<ResolvedFeaturedEvent | null> {
  noStore();
  const row = await readFeaturedRow();
  if (!row) return null;

  const now = Date.now();
  if (!isWithinWindow(row, now)) return null;

  const resolvedIndex = index ?? (await getEventIndex());
  const series =
    (row.event_identifier
      ? resolvedIndex.byIdentifier.get(row.event_identifier)
      : undefined) ??
    (row.event_slug ? resolvedIndex.bySlug.get(row.event_slug) : undefined) ??
    null;

  if (series) {
    if (lastOccurrenceEnd(series) <= now) return null;
  } else {
    // Feed outage fallback — only safe with a complete stored snapshot.
    const ended = row.event_ends_at ? Date.parse(row.event_ends_at) <= now : true;
    const incomplete =
      EMPTY(row.headline) || EMPTY(row.blurb) || EMPTY(row.image_url) || EMPTY(row.cta_link);
    if (ended || incomplete) return null;
  }

  const primary = series?.primary;
  const feedCta = primary ? eventSignupUrl(primary) : null;

  return {
    slug: series?.slug ?? row.event_slug ?? "",
    identifier: row.event_identifier,
    headline: row.headline?.trim() || series?.name || row.event_name || "",
    blurb:
      row.blurb?.trim() ||
      (primary ? eventDescriptionText(primary, 220) : "") ||
      "",
    imageUrl: row.image_url || (primary ? eventImage(primary, "hero") ?? null : null),
    ctaText: row.cta_text?.trim() || (feedCta ? "Sign up" : "Find out more"),
    ctaLink:
      row.cta_link?.trim() ||
      (series ? `/whats-on/${series.slug}` : row.event_slug ? `/whats-on/${row.event_slug}` : "/whats-on"),
    dateLine: primary
      ? parseFeedDate(primary.datetime_start).toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      : null,
    locationName: primary?.location?.name || null,
    series: series ?? null,
    updatedAt: row.updated_at,
  };
}

/**
 * The event popup, when one is configured and its event is still live.
 *
 * Returning non-null is also the signal that suppresses the generic site popup
 * — app/layout.tsx passes `null` to <SitePopup> whenever this resolves.
 */
export async function getActiveEventPopup(
  index?: EventIndex,
): Promise<ResolvedEventPopup | null> {
  noStore();
  const row = await readFeaturedRow();
  if (!row || !row.popup_active) return null;

  const featured = await getFeaturedEvent(index);
  if (!featured) return null;

  const title = row.popup_title?.trim() || featured.headline;
  const body = row.popup_body?.trim() || featured.blurb;
  const imageUrl = row.popup_image_url || featured.imageUrl;
  if (!title && !body && !imageUrl) return null;

  return {
    eventSlug: featured.slug,
    identifier: featured.identifier,
    title,
    body,
    imageUrl,
    ctaText: row.popup_cta_text?.trim() || featured.ctaText,
    ctaLink: row.popup_cta_link?.trim() || featured.ctaLink,
    updatedAt: row.updated_at,
  };
}
