// Reading, saving and clearing the simulated broadcast — the logic, with no
// opinion about who is allowed to call it.
//
// There are two doors into this: `/api/admin/simulated-live` (behind
// middleware.ts, reached from /admin/live) and `/api/live-control` (hanging off
// the public /live page, self-authorising via requireHost()). Both are thin
// wrappers around the functions here, differing only in how they establish the
// caller. That is deliberate: two surfaces editing one row must not be able to
// disagree about what a valid broadcast is, and the way to guarantee that is to
// give them one implementation rather than two that look alike today.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { clearSimulatedLiveCache, rowToConfig } from "@/lib/simulatedLive.server";
import {
  parseYouTubeId,
  simulatedEndsAt,
  simulatedPhase,
  type SimulatedLiveConfig,
} from "@/lib/simulatedLive";
import { lookupVideo } from "@/lib/youtubeLookup.server";

const SELECT = "active, video_id, title, starts_at, duration_seconds, notice, updated_at";

export type ControlResult =
  | { ok: true; data: ReturnType<typeof withPhase> }
  | { ok: false; status: number; error: string };

/** Config plus the state it implies, so no caller has to redo the arithmetic. */
function withPhase(config: SimulatedLiveConfig) {
  return {
    ...config,
    phase: simulatedPhase(config),
    endsAt: simulatedEndsAt(config),
    /**
     * The server's clock. Both control surfaces count down against this rather
     * than the device's, so the readout in someone's hand agrees with what the
     * congregation is actually watching.
     */
    serverTime: new Date().toISOString(),
  };
}

async function currentRow() {
  const supabase = createServiceClient();
  return supabase.from("simulated_live").select(SELECT).eq("id", 1).maybeSingle();
}

export async function readSimulatedLive(): Promise<ControlResult> {
  const { data, error } = await currentRow();
  if (error) return { ok: false, status: 500, error: error.message };
  return { ok: true, data: withPhase(rowToConfig(data)) };
}

export async function writeSimulatedLive(
  body: Record<string, unknown>
): Promise<ControlResult> {
  const active = Boolean(body.active);
  const rawVideo = typeof body.video === "string" ? body.video.trim() : "";
  const videoId = rawVideo ? parseYouTubeId(rawVideo) : null;
  if (rawVideo && !videoId) {
    return {
      ok: false,
      status: 400,
      error: "That doesn't look like a YouTube link or video ID.",
    };
  }

  const startsAt = parseInstant(body.startsAt);
  if (body.startsAt && !startsAt) {
    return { ok: false, status: 400, error: "Invalid start time." };
  }

  const title = trimmedOrNull(body.title, 200);
  const notice = trimmedOrNull(body.notice, 200);

  // The runtime decides when the broadcast ends, so it is resolved here rather
  // than trusted from the form — someone who edits the start time after pasting
  // the link must not be able to leave a stale duration behind. A caller-supplied
  // value is the fallback for when YouTube can't be reached (no API key, quota
  // exhausted), which is exactly when the controls offer a manual field.
  let durationSeconds = positiveInt(body.durationSeconds);
  if (videoId) {
    const looked = await lookupVideo(videoId);
    if (looked?.durationSeconds) durationSeconds = looked.durationSeconds;
  }

  if (active && (!videoId || !startsAt || !durationSeconds)) {
    return {
      ok: false,
      status: 400,
      error:
        "A simulated broadcast needs a video, a start time and a runtime before it can go on air.",
    };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("simulated_live").upsert(
    {
      id: 1,
      active,
      video_id: videoId,
      title,
      starts_at: startsAt,
      duration_seconds: durationSeconds,
      notice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) return { ok: false, status: 500, error: error.message };

  // This instance's memo is now wrong; other instances expire theirs within ten
  // seconds. Without it, "Start now" appears to do nothing for a moment.
  clearSimulatedLiveCache();

  const { data } = await currentRow();
  return { ok: true, data: withPhase(rowToConfig(data)) };
}

/**
 * Remove the scheduled service entirely — blank the row rather than just
 * switching it off.
 *
 * Distinct from `active: false` on purpose. Taking something off air is a thing
 * you do mid-service and might undo; removing it is "we're not doing this, clear
 * the decks", and leaving a half-remembered video id and last week's start time
 * sitting in the form is how someone accidentally re-broadcasts it.
 */
export async function clearSimulatedLive(): Promise<ControlResult> {
  const supabase = createServiceClient();
  const { error } = await supabase.from("simulated_live").upsert(
    {
      id: 1,
      active: false,
      video_id: null,
      title: null,
      starts_at: null,
      duration_seconds: null,
      notice: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (error) return { ok: false, status: 500, error: error.message };
  clearSimulatedLiveCache();

  const { data } = await currentRow();
  return { ok: true, data: withPhase(rowToConfig(data)) };
}

/* ── Input coercion ──────────────────────────────────────────────────────── */

function parseInstant(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

function trimmedOrNull(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

function positiveInt(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n);
  return rounded > 0 && rounded <= 86_400 ? rounded : null;
}
