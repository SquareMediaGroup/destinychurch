// Simulated live — the pure half. No database, no fetch, no React, so the
// admin page, the player and the server resolver all reason about a broadcast
// with exactly the same arithmetic.
//
// The model is deliberately tiny. A simulated broadcast is a video id and an
// instant. Everything a viewer sees follows from `now - startsAt`:
//
//   before startsAt                          → scheduled (off air, countdown)
//   startsAt … startsAt + durationSeconds    → airing at that many seconds in
//   after that                               → finished (off air)
//
// Because the position is derived rather than stored, every viewer is at the
// same point without anything being pushed to them, and someone joining forty
// minutes late joins forty minutes in.

export interface SimulatedLiveConfig {
  /** Admin intent. On air also needs the clock to agree — see simulatedPhase. */
  active: boolean;
  videoId: string | null;
  title: string | null;
  /** ISO instant the simulated broadcast begins. */
  startsAt: string | null;
  durationSeconds: number | null;
  /** Optional line shown under the player. */
  notice: string | null;
}

export const EMPTY_SIMULATED_LIVE: SimulatedLiveConfig = {
  active: false,
  videoId: null,
  title: null,
  startsAt: null,
  durationSeconds: null,
  notice: null,
};

export type SimulatedPhase =
  /** Switched off, or missing something it needs to run. */
  | "off"
  /** Ready and switched on, but the start time hasn't arrived. */
  | "scheduled"
  /** On air right now. */
  | "airing"
  /** Ran and finished. */
  | "finished";

/** Everything present and switched on. Says nothing about the clock. */
export function isSimulatedLiveReady(
  config: SimulatedLiveConfig
): config is SimulatedLiveConfig & {
  videoId: string;
  startsAt: string;
  durationSeconds: number;
} {
  return Boolean(
    config.active &&
      config.videoId &&
      config.startsAt &&
      config.durationSeconds &&
      config.durationSeconds > 0 &&
      !Number.isNaN(Date.parse(config.startsAt))
  );
}

export function simulatedPhase(
  config: SimulatedLiveConfig,
  now: number = Date.now()
): SimulatedPhase {
  if (!isSimulatedLiveReady(config)) return "off";
  const start = Date.parse(config.startsAt);
  if (now < start) return "scheduled";
  if (now >= start + config.durationSeconds * 1000) return "finished";
  return "airing";
}

/**
 * Seconds into the video every viewer should be at, for a broadcast that is
 * airing. Clamped to the video's runtime so a late-arriving poll can't ask the
 * player to seek past the end.
 *
 * `now` is the caller's *corrected* clock — the browser passes
 * `Date.now() + skew`, where skew comes from the server timestamp on the live
 * status payload. A viewer whose laptop clock is two minutes fast would
 * otherwise watch two minutes ahead of everyone else.
 */
export function simulatedPosition(
  config: SimulatedLiveConfig,
  now: number = Date.now()
): number {
  if (!isSimulatedLiveReady(config)) return 0;
  const elapsed = (now - Date.parse(config.startsAt)) / 1000;
  return Math.min(Math.max(elapsed, 0), config.durationSeconds);
}

/** ISO instant the broadcast goes off air, or null if it isn't runnable. */
export function simulatedEndsAt(config: SimulatedLiveConfig): string | null {
  if (!isSimulatedLiveReady(config)) return null;
  return new Date(
    Date.parse(config.startsAt) + config.durationSeconds * 1000
  ).toISOString();
}

/* ── YouTube links ───────────────────────────────────────────────────────── */

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * The id out of anything someone might paste: a watch URL, a share link, a
 * `/live/` permalink, an embed, a Short, or the bare id itself.
 *
 * Written against `URL` rather than one big regex because the interesting
 * failure is a *near miss* — `youtube.com/@DestinyOnlineChurch` has no id and
 * must come back null rather than matching eleven characters of the handle.
 */
export function parseYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (VIDEO_ID.test(trimmed)) return trimmed;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const isYouTube =
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com" ||
    host === "youtu.be";
  if (!isYouTube) return null;

  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id && VIDEO_ID.test(id) ? id : null;
  }

  const v = url.searchParams.get("v");
  if (v && VIDEO_ID.test(v)) return v;

  const segments = url.pathname.split("/").filter(Boolean);
  // /live/<id>, /embed/<id>, /shorts/<id>, /v/<id>
  const prefixed = ["live", "embed", "shorts", "v"];
  if (segments.length >= 2 && prefixed.includes(segments[0].toLowerCase())) {
    const id = segments[1];
    return VIDEO_ID.test(id) ? id : null;
  }

  return null;
}

/**
 * ISO 8601 duration (`PT1H2M10S`, what contentDetails.duration returns) to
 * seconds. `formatDuration` in lib/youtube.ts renders the same string for
 * display; this is the arithmetic half, and it is what decides when a
 * simulated broadcast ends.
 */
export function parseIsoDurationSeconds(iso: string | undefined): number | null {
  if (!iso) return null;
  const match = iso.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  const [, d, h, m, s] = match;
  if (!d && !h && !m && !s) return null;
  const total =
    Number(d ?? 0) * 86400 +
    Number(h ?? 0) * 3600 +
    Number(m ?? 0) * 60 +
    Number(s ?? 0);
  return total > 0 ? total : null;
}

/** `1:02:10` / `4:07` — the admin readout's "14:32 of 1:02:10". */
export function formatTimecode(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
