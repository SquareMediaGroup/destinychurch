// Server-only event lookups: the ChurchSuite index, and the featured event
// that /whats-on, the homepage carousel and the event popup all read.
import "server-only";
import { cache } from "react";
import { unstable_noStore as noStore } from "next/cache";
import {
  buildEventIndex,
  eventDescriptionText,
  eventImage,
  eventSignupUrl,
  fetchChurchSuiteEventsResult,
  lastOccurrenceEnd,
  parseFeedDate,
  type EventIndex,
  type EventSeries,
} from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { RESERVED_EVENT_SLUGS } from "@/lib/events";
import { clearOutage, getOutageState, markOutage } from "@/lib/outage";

/** The event index, plus whether the feed could be read at all. */
export type LoadedEventIndex = EventIndex & {
  /**
   * True when the feed could not be reached or read, so the (empty) index
   * means "we don't know", not "nothing is on". Pages show the weekly
   * gatherings and an apology instead of "no upcoming events".
   */
  unavailable: boolean;
};

/**
 * Every upcoming event, grouped into series with stable slugs.
 *
 * A failed feed still yields an empty index, so callers that only iterate keep
 * working; `unavailable` is what tells an outage apart from an empty calendar.
 */
async function loadEventIndex(): Promise<LoadedEventIndex> {
  // The feed failed moments ago: don't make this request wait out another
  // timeout. (A cached copy would have been served instead of failing, so
  // skipping the fetch here never hides events we already had.)
  if (getOutageState().events) {
    return { ...buildEventIndex([], { reservedSlugs: RESERVED_EVENT_SLUGS }), unavailable: true };
  }
  const result = await fetchChurchSuiteEventsResult({
    next: { revalidate: 300 },
    // A hung feed must not hold up every page that shows events.
    signal: AbortSignal.timeout(5_000),
  });
  if (result.ok) clearOutage("events");
  else markOutage("events");
  const index = buildEventIndex(result.ok ? result.events : [], {
    reservedSlugs: RESERVED_EVENT_SLUGS,
  });
  return { ...index, unavailable: !result.ok };
}
// Built once per request: the layout's event popup and the page (homepage
// rail, /whats-on) each need it, and parsing the feed isn't free.
export const getEventIndex = cache(loadEventIndex);

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

async function fetchFeaturedRow(): Promise<FeaturedEventRow | null> {
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
// Once per request: the layout's popup, the page's hero and getFeaturedEvent
// inside getActiveEventPopup all read this row.
const readFeaturedRow = cache(fetchFeaturedRow);

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
