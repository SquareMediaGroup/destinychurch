// Reading and writing the single `simulated_live` row. Server-only: it holds
// the service-role client, so nothing in a client bundle may import it. The
// arithmetic lives in lib/simulatedLive.ts, which is safe on both sides.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import {
  EMPTY_SIMULATED_LIVE,
  type SimulatedLiveConfig,
} from "@/lib/simulatedLive";

interface Row {
  active: boolean | null;
  video_id: string | null;
  title: string | null;
  starts_at: string | null;
  duration_seconds: number | null;
  notice: string | null;
}

export function rowToConfig(row: Row | null): SimulatedLiveConfig {
  if (!row) return EMPTY_SIMULATED_LIVE;
  return {
    active: Boolean(row.active),
    videoId: row.video_id,
    title: row.title,
    startsAt: row.starts_at,
    durationSeconds: row.duration_seconds,
    notice: row.notice,
  };
}

/* The live status is polled by every open tab every 30 seconds, and by the
   root layout on every dynamic render. A short in-process memo keeps that from
   becoming one database round trip per request, matching how getLiveStatus()
   already memoises the YouTube scrape.

   Ten seconds rather than the YouTube path's thirty: this is the row an admin
   has just pressed "Start now" on, and they are watching /live in another tab
   to see it work. */
const TTL_MS = 10_000;

let cache: { value: SimulatedLiveConfig; expiresAt: number } | null = null;
let inFlight: Promise<SimulatedLiveConfig> | null = null;

/** Drop the memo after an admin write, so the change shows up immediately. */
export function clearSimulatedLiveCache() {
  cache = null;
}

export async function getSimulatedLiveConfig(): Promise<SimulatedLiveConfig> {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("simulated_live")
      .select("active, video_id, title, starts_at, duration_seconds, notice")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return rowToConfig(data as Row | null);
  })()
    .then((value) => {
      cache = { value, expiresAt: Date.now() + TTL_MS };
      return value;
    })
    .catch(() => {
      // A database blip must not take /live down, and must not silently switch
      // a running simulated service off either — hold the last known answer.
      console.error("⚠️ simulated live lookup failed");
      return cache?.value ?? EMPTY_SIMULATED_LIVE;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
