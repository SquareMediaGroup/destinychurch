// Read and write the simulated live broadcast. Gated by middleware.ts +
// ROUTE_RULES (`host` — the same people who run the chat on a Sunday).

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import {
  clearSimulatedLiveCache,
  rowToConfig,
} from "@/lib/simulatedLive.server";
import {
  parseYouTubeId,
  simulatedEndsAt,
  simulatedPhase,
  type SimulatedLiveConfig,
} from "@/lib/simulatedLive";
import { lookupVideo } from "./lookup/lookupVideo";

export const dynamic = "force-dynamic";

const SELECT = "active, video_id, title, starts_at, duration_seconds, notice, updated_at";

/** Config plus the state it implies, so the admin readout needs no arithmetic. */
function withPhase(config: SimulatedLiveConfig) {
  return {
    ...config,
    phase: simulatedPhase(config),
    endsAt: simulatedEndsAt(config),
    /** The server's clock — the admin page counts down against this, not its own. */
    serverTime: new Date().toISOString(),
  };
}

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("simulated_live")
    .select(SELECT)
    .eq("id", 1)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(withPhase(rowToConfig(data)));
}

export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const active = Boolean(body.active);
  const rawVideo = typeof body.video === "string" ? body.video.trim() : "";
  const videoId = rawVideo ? parseYouTubeId(rawVideo) : null;
  if (rawVideo && !videoId) {
    return NextResponse.json(
      { error: "That doesn't look like a YouTube link or video ID." },
      { status: 400 }
    );
  }

  const startsAt = parseInstant(body.startsAt);
  if (body.startsAt && !startsAt) {
    return NextResponse.json({ error: "Invalid start time." }, { status: 400 });
  }

  const title = trimmedOrNull(body.title, 200);
  const notice = trimmedOrNull(body.notice, 200);

  // The runtime decides when the broadcast ends, so it is resolved here rather
  // than trusted from the form — an admin who edits the start time after
  // pasting the link must not be able to leave a stale duration behind. A
  // caller-supplied value is the fallback for when YouTube can't be reached
  // (no API key, quota exhausted), which is exactly when the admin page offers
  // the manual field.
  let durationSeconds = positiveInt(body.durationSeconds);
  if (videoId) {
    const looked = await lookupVideo(videoId);
    if (looked?.durationSeconds) durationSeconds = looked.durationSeconds;
  }

  if (active && (!videoId || !startsAt || !durationSeconds)) {
    return NextResponse.json(
      {
        error:
          "A simulated broadcast needs a video, a start time and a runtime before it can go on air.",
      },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("simulated_live")
    .upsert(
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // This instance's memo is now wrong; other instances expire theirs within ten
  // seconds. Without it, "Start now" would appear to do nothing for a moment.
  clearSimulatedLiveCache();

  const { data } = await supabase
    .from("simulated_live")
    .select(SELECT)
    .eq("id", 1)
    .maybeSingle();

  return NextResponse.json(withPhase(rowToConfig(data)));
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
