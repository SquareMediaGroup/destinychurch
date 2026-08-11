import { appJson, DEGRADED_NOTICE, simulatedState } from "@/lib/appApi";
import { serializePodcastShow } from "@/lib/appSerializers";
import { getPodcastShow } from "@/lib/podcast";

// App BFF — the DCTV podcast feed.
//
// Note the asymmetry with the events route: `getPodcastShow()` *throws* on a
// non-OK Buzzsprout response rather than returning an empty result, so this
// one needs a try/catch, not a result type.
//
// `audioUrl` is a direct MP3 on Buzzsprout's CDN, which the app streams with
// AVPlayer. Buzzsprout serves byte ranges, which is what makes seeking work.

export const revalidate = 1800;

const CACHE = "public, s-maxage=1800, stale-while-revalidate=3600";

const EMPTY = { show: null };

export async function GET(request: Request) {
  const simulate = simulatedState(request);

  if (simulate === "error" || simulate === "degraded") {
    return appJson(EMPTY, {
      status: "degraded",
      notice: DEGRADED_NOTICE.podcast,
      cacheControl: CACHE,
    });
  }

  try {
    const show = await getPodcastShow();
    const serialized = serializePodcastShow(show);
    return appJson(
      { show: simulate === "empty" ? { ...serialized, episodes: [] } : serialized },
      { cacheControl: CACHE },
    );
  } catch {
    return appJson(EMPTY, {
      status: "degraded",
      notice: DEGRADED_NOTICE.podcast,
      cacheControl: CACHE,
    });
  }
}
