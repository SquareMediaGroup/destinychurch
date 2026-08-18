// "Are we live?" — the composed answer, and the only one the site should ask.
//
// Two things can put /live on air:
//
//   1. A real YouTube broadcast (lib/youtube.ts scrapes and confirms it).
//   2. A simulated one — a pre-uploaded video played from a fixed start time,
//      so every viewer is at the same point (lib/simulatedLive.ts).
//
// The real broadcast is checked first and always wins. That ordering is the
// safety property: a simulated service someone forgot to switch off cannot
// take a genuine Sunday stream off the page. It also costs nothing extra — the
// YouTube check is memoised in-process either way.
//
// Everything downstream — the banner, the /live player, the live chat guard,
// the mobile app's BFF — reads this one function, so none of them need to know
// which kind of broadcast they are looking at.

import "server-only";
import {
  getYouTubeLiveStatus,
  type LiveStatus,
} from "@/lib/youtube";
import { getSimulatedLiveConfig } from "@/lib/simulatedLive.server";
import {
  simulatedEndsAt,
  simulatedPhase,
  type SimulatedLiveConfig,
} from "@/lib/simulatedLive";

export type { LiveStatus };

export async function getLiveStatus(): Promise<LiveStatus> {
  const real = await getYouTubeLiveStatus();
  const serverTime = new Date().toISOString();

  // A genuine stream needs no help from us.
  if (real.live) return { ...real, serverTime };

  let simulated: SimulatedLiveConfig;
  try {
    simulated = await getSimulatedLiveConfig();
  } catch {
    return { ...real, serverTime };
  }

  switch (simulatedPhase(simulated)) {
    case "airing":
      return {
        live: true,
        videoId: simulated.videoId,
        title: simulated.title ?? undefined,
        // The playhead origin. The browser derives its own position from this
        // rather than being told one, so a cached response can't desync anyone.
        startedAt: simulated.startsAt ?? undefined,
        endsAt: simulatedEndsAt(simulated) ?? undefined,
        notice: simulated.notice ?? undefined,
        simulated: true,
        checkedAt: serverTime,
        serverTime,
        source: "simulated",
      };

    case "scheduled":
      // Still off air, but the page can count down to a real time instead of
      // the generic "next Sunday, 11am".
      return {
        ...real,
        scheduledFor: simulated.startsAt ?? real.scheduledFor,
        title: simulated.title ?? real.title,
        simulated: true,
        checkedAt: serverTime,
        serverTime,
        source: "simulated-scheduled",
      };

    default:
      return { ...real, serverTime };
  }
}

// Note for the routes that serve this: `simulated` is set on both the airing
// and the scheduled answers, and on neither of the others. That makes it the
// flag to check before allowing a CDN cache — those are precisely the two
// states whose payload carries a clock the browser depends on.
