import { appJson, DEGRADED_NOTICE, simulatedState } from "@/lib/appApi";
import { serializeSermon } from "@/lib/appSerializers";
import { formatServiceDay, nextSundayService } from "@/lib/serviceTimes";
import { getLiveStatus } from "@/lib/liveStatus.server";
import { getLatestVideo } from "@/lib/speakerOverrides.server";

// App BFF — live stream status.
//
// The app polls this every 30s while foregrounded, mirroring
// `contexts/LiveContext.tsx` (including its OFFLINE_GRACE of two consecutive
// offline reads before tearing the player down — YouTube's live detection
// flaps, and one bad poll should not kill a stream someone is watching).
//
// `nextService` and `latestReplay` exist so the offline state has somewhere to
// go instead of being a dead end.

export const dynamic = "force-dynamic";

const CACHE = "public, s-maxage=30, stale-while-revalidate=30";

export async function GET(request: Request) {
  const simulate = simulatedState(request);

  if (simulate === "error" || simulate === "degraded") {
    return appJson(
      { live: false, videoId: null, nextService: null, latestReplay: null },
      { status: "degraded", notice: DEGRADED_NOTICE.live, cacheControl: CACHE },
    );
  }

  const [status, latest] = await Promise.all([
    getLiveStatus(),
    // A replay failure must not take the live status down with it.
    getLatestVideo().catch(() => null),
  ]);

  const next = nextSundayService();

  return appJson(
    {
      live: simulate === "empty" ? false : status.live,
      videoId: simulate === "empty" ? null : status.videoId,
      title: status.title ?? null,
      startedAt: status.startedAt ?? null,
      scheduledFor: status.scheduledFor ?? null,
      // Simulated live was retired along with the /live page. The fields stay
      // in the payload, fixed off, so shipped app builds keep decoding it.
      simulated: false,
      endsAt: null,
      notice: null,
      serverTime: status.serverTime ?? status.checkedAt,
      checkedAt: status.checkedAt,
      nextService: {
        startsAt: next.toISOString(),
        label: formatServiceDay(next),
      },
      latestReplay: latest ? serializeSermon(latest) : null,
    },
    {
      cacheControl: CACHE,
    },
  );
}
