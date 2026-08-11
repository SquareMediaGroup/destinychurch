import { buildEventIndex, fetchChurchSuiteEventsResult } from "@destiny/shared";
import { appJson, DEGRADED_NOTICE, simulatedState } from "@/lib/appApi";
import { serializeEventSeries } from "@/lib/appSerializers";
import { RESERVED_EVENT_SLUGS } from "@/lib/events";

// App BFF — a single event series.
//
// The app never calls this in normal use: the list response carries every
// series in full, so the detail screen renders from data it already has. This
// route exists for deep-link cold start, where the app is opened straight onto
// an event it has never fetched.

export const revalidate = 300;

const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const simulate = simulatedState(request);

  if (simulate === "error" || simulate === "degraded") {
    return appJson(
      { series: null },
      { status: "degraded", notice: DEGRADED_NOTICE.events, cacheControl: CACHE },
    );
  }

  const result = await fetchChurchSuiteEventsResult({ next: { revalidate: 300 } });

  if (!result.ok) {
    return appJson(
      { series: null },
      { status: "degraded", notice: DEGRADED_NOTICE.events, cacheControl: CACHE },
    );
  }

  const index = buildEventIndex(result.events, {
    reservedSlugs: RESERVED_EVENT_SLUGS,
  });
  const series = index.bySlug.get(slug);

  // A 404 is the honest answer for an event that has finished — the app shows
  // "this event has ended" rather than an error state.
  if (!series) {
    return appJson({ series: null }, { cacheControl: CACHE });
  }

  return appJson({ series: serializeEventSeries(series) }, { cacheControl: CACHE });
}
