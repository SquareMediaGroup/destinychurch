import { buildEventIndex, fetchChurchSuiteEventsResult } from "@destiny/shared";
import { appJson, DEGRADED_NOTICE, simulatedState } from "@/lib/appApi";
import { serializeEventSeries } from "@/lib/appSerializers";
import { RESERVED_EVENT_SLUGS } from "@/lib/events";

// App BFF — the events feed.
//
// Two deliberate choices:
//
// 1. `buildEventIndex`, not `deduplicateEvents`. Dedup groups by lowercased
//    name and keeps an arbitrary occurrence; the index groups by the real
//    series key (`sequence ?? id`), drops past events, and mints the *same*
//    slugs as the website — so an app event and a web event share a URL.
//
// 2. `fetchChurchSuiteEventsResult`, not `fetchChurchSuiteEvents`. The latter
//    flattens every failure to `[]`, which the app would render as "nothing
//    on" during an outage. See docs/mobile-app-scope.md §5.3.
//
// The full payload ships in the list response — a few dozen series, well under
// 100 KB — so the detail screen needs no network and has no loading state.

export const revalidate = 300;

const CACHE = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET(request: Request) {
  const simulate = simulatedState(request);

  if (simulate === "error" || simulate === "degraded") {
    return appJson(
      { series: [] },
      { status: "degraded", notice: DEGRADED_NOTICE.events, cacheControl: CACHE },
    );
  }
  if (simulate === "empty") {
    return appJson({ series: [] }, { cacheControl: CACHE });
  }

  const result = await fetchChurchSuiteEventsResult({ next: { revalidate: 300 } });

  if (!result.ok) {
    return appJson(
      { series: [] },
      { status: "degraded", notice: DEGRADED_NOTICE.events, cacheControl: CACHE },
    );
  }

  const index = buildEventIndex(result.events, {
    reservedSlugs: RESERVED_EVENT_SLUGS,
  });

  return appJson(
    { series: index.series.map(serializeEventSeries) },
    { cacheControl: CACHE },
  );
}
