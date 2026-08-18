import { buildEventIndex, fetchChurchSuiteEventsResult } from "@destiny/shared";
import { appJson, DEGRADED_NOTICE, absolute, simulatedState } from "@/lib/appApi";
import {
  serializeEventSeries,
  serializePodcastEpisode,
  serializeSermon,
  type AppEventSeries,
  type AppPodcastEpisode,
  type AppSermon,
} from "@/lib/appSerializers";
import { RESERVED_EVENT_SLUGS } from "@/lib/events";
import { getFeaturedEvent } from "@/lib/events.server";
import { getPodcastShow } from "@/lib/podcast";
import { formatServiceDay, nextSundayService } from "@/lib/serviceTimes";
import { getLiveStatus } from "@/lib/liveStatus.server";
import { getLatestVideo } from "@/lib/youtube";

// App BFF — the Home screen, in one request.
//
// Home draws on five independent upstreams. Fetching them separately would
// mean five round trips on a cold launch; fetching them together with a single
// try/catch would mean one flaky feed blanks the whole screen. So: settle them
// all in parallel, and let each section fail on its own. The envelope reports
// `degraded` if any section is missing, and the app omits just that card.
//
// `getFeaturedEvent` reads Supabase and calls `noStore()`, which is why this
// route is dynamic. The CDN header we set still bounds how often it is hit.

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=120, stale-while-revalidate=600";

/** `Promise.allSettled` gives us `rejected`; this flattens it to null. */
function settled<T>(result: PromiseSettledResult<T>): T | null {
  return result.status === "fulfilled" ? result.value : null;
}

export async function GET(request: Request) {
  const simulate = simulatedState(request);

  if (simulate === "error" || simulate === "degraded") {
    return appJson(
      {
        live: null,
        nextService: null,
        featuredEvent: null,
        upcomingEvents: [],
        latestSermon: null,
        latestEpisode: null,
      },
      { status: "degraded", notice: DEGRADED_NOTICE.home, cacheControl: CACHE },
    );
  }

  const [eventsResult, liveResult, sermonResult, podcastResult] =
    await Promise.allSettled([
      fetchChurchSuiteEventsResult({ next: { revalidate: 300 } }),
      getLiveStatus(),
      getLatestVideo(),
      getPodcastShow(),
    ]);

  const feed = settled(eventsResult);
  const index =
    feed?.ok === true
      ? buildEventIndex(feed.events, { reservedSlugs: RESERVED_EVENT_SLUGS })
      : null;

  // The featured event depends on the index, so it is resolved after the fan-out.
  const featured = index
    ? await getFeaturedEvent(index).catch(() => null)
    : null;

  const live = settled(liveResult);
  const latestSermon = settled(sermonResult);
  const show = settled(podcastResult);
  const next = nextSundayService();

  let upcomingEvents: AppEventSeries[] = [];
  if (index) upcomingEvents = index.series.slice(0, 5).map(serializeEventSeries);

  const latestEpisode: AppPodcastEpisode | null = show?.episodes[0]
    ? serializePodcastEpisode(show.episodes[0])
    : null;

  const sermon: AppSermon | null = latestSermon ? serializeSermon(latestSermon) : null;

  // Only sections that should *always* be present count towards degraded.
  // A missing featured event is normal — there often isn't one promoted. A
  // missing events index, live status or latest sermon is not: the channel
  // and calendar are never genuinely empty, so absence means an upstream is
  // down and the app should say so rather than quietly drop the card.
  const missing = index === null || live === null || sermon === null;

  return appJson(
    {
      live: live
        ? {
            live: live.live,
            videoId: live.videoId,
            title: live.title ?? null,
            scheduledFor: live.scheduledFor ?? null,
          }
        : null,
      nextService: { startsAt: next.toISOString(), label: formatServiceDay(next) },
      featuredEvent: featured
        ? {
            slug: featured.slug,
            headline: featured.headline,
            blurb: featured.blurb,
            imageUrl: absolute(featured.imageUrl),
            ctaText: featured.ctaText,
            ctaLink: absolute(featured.ctaLink),
            dateLine: featured.dateLine,
            locationName: featured.locationName,
          }
        : null,
      upcomingEvents,
      latestSermon: sermon,
      latestEpisode,
    },
    {
      status: missing ? "degraded" : "ok",
      notice: missing ? DEGRADED_NOTICE.home : null,
      cacheControl: CACHE,
    },
  );
}
