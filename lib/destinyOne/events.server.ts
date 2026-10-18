// Destiny One — the Event attach picker's feed, and turning a picked event
// into the immutable snapshot a message carries. Reuses the same public
// ChurchSuite calendar feed and index the website's own events API
// (app/api/app/v1/events/route.ts) already builds from, so an event picked in
// chat shares its slug/URL with the website.
//
// Snapshot-as-of-send, not a live mirror: never trust the client's own copy of
// an event (it could be stale or made up), so this always re-fetches and
// re-derives the snapshot server-side from the ref's slug + seriesKey alone.

import "server-only";
import { buildEventIndex, fetchChurchSuiteEventsResult, type D1EventContent, type D1EventRef, type D1EventSummary } from "@destiny/shared";
import { serializeEventSeries } from "@/lib/appSerializers";
import { RESERVED_EVENT_SLUGS } from "@/lib/events";
import { OneError } from "@/lib/destinyOne/http";

async function loadIndex() {
  const result = await fetchChurchSuiteEventsResult({ next: { revalidate: 300 } });
  if (!result.ok) {
    throw new OneError("unavailable", "Events are temporarily unavailable. Please try again shortly.");
  }
  return buildEventIndex(result.events, { reservedSlugs: RESERVED_EVENT_SLUGS });
}

export async function listUpcomingEvents(): Promise<D1EventSummary[]> {
  const index = await loadIndex();
  return index.series.map((series) => {
    const s = serializeEventSeries(series);
    return {
      seriesKey: s.seriesKey,
      slug: s.slug,
      name: s.name,
      startsAt: s.next.startsAt,
      location: s.location?.name ?? null,
      thumbnailUrl: s.thumbnailUrl,
      webUrl: s.webUrl,
    };
  });
}

/** Every upcoming event series from the ChurchSuite calendar, fully serialized (DestinyAI's find_events tool). */
export async function upcomingEventSeries() {
  const index = await loadIndex();
  return index.series.map(serializeEventSeries);
}

export async function buildEventSnapshot(ref: D1EventRef): Promise<D1EventContent> {
  const index = await loadIndex();
  const series = index.bySlug.get(ref.slug);
  if (!series || series.seriesKey !== ref.seriesKey) {
    throw new OneError("not_found", "That event isn't available anymore.");
  }
  const s = serializeEventSeries(series);
  return {
    kind: "event",
    event: {
      seriesKey: s.seriesKey,
      slug: s.slug,
      name: s.name,
      startsAt: s.next.startsAt,
      location: s.location?.name ?? null,
      imageUrl: s.thumbnailUrl,
      webUrl: s.webUrl,
    },
  };
}
