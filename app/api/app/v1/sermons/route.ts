import { appJson, DEGRADED_NOTICE, simulatedState } from "@/lib/appApi";
import { serializeSermon } from "@/lib/appSerializers";
import { CHANNEL_URL, getAllVideos, isYouTubeQuotaExceeded } from "@/lib/youtube";

// App BFF — the sermon video feed.
//
// A YouTube quota trip is reported as `degraded` rather than an error, and the
// app pairs the notice with a "Watch on YouTube" link so the screen still does
// something useful. `channelUrl` is included for exactly that escape hatch.

export const revalidate = 900;

const CACHE = "public, s-maxage=900, stale-while-revalidate=3600";

export async function GET(request: Request) {
  const simulate = simulatedState(request);

  if (simulate === "error" || simulate === "degraded") {
    return appJson(
      { videos: [], channelUrl: CHANNEL_URL },
      { status: "degraded", notice: DEGRADED_NOTICE.sermons, cacheControl: CACHE },
    );
  }
  if (simulate === "empty") {
    return appJson({ videos: [], channelUrl: CHANNEL_URL }, { cacheControl: CACHE });
  }

  const [videos, quotaExceeded] = await Promise.all([
    getAllVideos(50).catch(() => [] as Awaited<ReturnType<typeof getAllVideos>>),
    isYouTubeQuotaExceeded().catch(() => false),
  ]);

  // An empty library is never a real state — the channel has 50+ sermons and
  // only grows. `getAllVideos` returns [] for a quota trip, a missing API key
  // and a network failure alike, so an empty result is always an outage and
  // must be reported as one. Reporting `ok` here would recreate the exact bug
  // the envelope exists to prevent: an app that says "no sermons" when it
  // means "we couldn't reach YouTube".
  if (videos.length === 0) {
    return appJson(
      { videos: [], channelUrl: CHANNEL_URL },
      {
        status: "degraded",
        // A quota trip resolves itself at midnight Pacific, so we can promise
        // "later today"; any other failure gets the vaguer wording.
        notice: quotaExceeded
          ? "Sermons are temporarily unavailable. Please try again later today."
          : DEGRADED_NOTICE.sermons,
        cacheControl: CACHE,
      },
    );
  }

  return appJson(
    { videos: videos.map(serializeSermon), channelUrl: CHANNEL_URL },
    { cacheControl: CACHE },
  );
}
