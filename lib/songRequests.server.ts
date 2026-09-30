// Event song requests: settings, queue reads, and the request rules.
// The rules live here, not in the route, so they can be unit tested.

import { createHash } from "crypto";
import { createServiceClient } from "@/utils/supabase/service";
import { addToQueue, getQueue, getTrack, SpotifyError } from "@/lib/spotify.server";

export interface SongSettings {
  open: boolean;
  event_name: string;
  max_queue: number;
  per_device_limit: number;
}

export interface SongRequestRow {
  id: string;
  spotify_track_id: string;
  title: string;
  artist: string;
  artwork_url: string | null;
  status: "queued" | "played" | "removed";
  created_at: string;
}

/** One request per device every 5 minutes, whatever happened to the last one. */
export const COOLDOWN_SECONDS = 300;

const DEVICE_RE = /^[A-Za-z0-9_-]{16,64}$/;
const TRACK_RE = /^[A-Za-z0-9]{10,40}$/;

export const hashValue = (v: string) =>
  createHash("sha256")
    .update(`${process.env.SONG_REQUEST_SALT ?? "destiny-song-requests"}:${v}`)
    .digest("hex")
    .slice(0, 32);

export async function getSettings(): Promise<SongSettings> {
  const { data } = await createServiceClient()
    .from("song_request_settings")
    .select("open, event_name, max_queue, per_device_limit")
    .eq("id", 1)
    .maybeSingle();
  return data ?? { open: false, event_name: "Song requests", max_queue: 25, per_device_limit: 3 };
}

export async function listRequests(limit = 30): Promise<SongRequestRow[]> {
  const { data } = await createServiceClient()
    .from("song_requests")
    .select("id, spotify_track_id, title, artist, artwork_url, status, created_at")
    .neq("status", "removed")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as SongRequestRow[];
}

// A request is given this long to show up in Spotify's queue before its
// absence is read as "already played".
const QUEUE_GRACE_MS = 60_000;

/**
 * Reads the queue for the public page. Spotify is the source of truth, so
 * songs added in the Spotify app appear alongside guest requests. Our own rows
 * are only bookkeeping: one that has left Spotify's queue (or is playing now)
 * is marked played. If Spotify can't answer, fall back to our own list.
 */
export async function getQueueView() {
  const [settings, live] = await Promise.all([getSettings(), getQueue()]);
  const supabase = createServiceClient();
  const requests = await listRequests();

  if (!live) {
    return { settings, playing: null, requests: [...requests].reverse() };
  }

  const inSpotify = new Set(live.queue.map((t) => t.id));
  if (live.playing) inSpotify.add(live.playing.id);
  const gone = requests
    .filter((r) => r.status === "queued")
    .filter((r) => !inSpotify.has(r.spotify_track_id) || r.spotify_track_id === live.playing?.id)
    .filter((r) => r.spotify_track_id === live.playing?.id || Date.now() - Date.parse(r.created_at) > QUEUE_GRACE_MS)
    .map((r) => r.id);
  if (gone.length) await supabase.from("song_requests").update({ status: "played" }).in("id", gone);

  return {
    settings,
    playing: live.playing
      ? { id: live.playing.id, title: live.playing.title, artist: live.playing.artist, artwork: live.playing.artwork }
      : null,
    requests: live.queue.slice(0, 20).map((t) => ({
      id: t.id,
      spotify_track_id: t.id,
      title: t.title,
      artist: t.artist,
      artwork_url: t.artwork,
      status: "queued" as const,
      created_at: "",
    })),
  };
}

/** Seconds until this device may request again (0 when it may now). */
export async function cooldownRemaining(deviceId: unknown): Promise<number> {
  if (typeof deviceId !== "string" || !DEVICE_RE.test(deviceId)) return 0;
  const { data } = await createServiceClient()
    .from("song_requests")
    .select("created_at")
    .eq("device_hash", hashValue(deviceId))
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return 0;
  const left = COOLDOWN_SECONDS - (Date.now() - Date.parse(data.created_at)) / 1000;
  return left > 0 ? Math.ceil(left) : 0;
}

export type RequestOutcome =
  | { ok: true; request: SongRequestRow; cooldown: number }
  | { ok: false; status: number; error: string; cooldown?: number };

export async function requestTrack(input: {
  trackId: unknown;
  deviceId: unknown;
  ip: string;
}): Promise<RequestOutcome> {
  const fail = (status: number, error: string): RequestOutcome => ({ ok: false, status, error });

  if (typeof input.trackId !== "string" || !TRACK_RE.test(input.trackId))
    return fail(400, "That song isn't available.");
  if (typeof input.deviceId !== "string" || !DEVICE_RE.test(input.deviceId))
    return fail(400, "Something went wrong. Please refresh and try again.");

  const settings = await getSettings();
  if (!settings.open) return fail(403, "Song requests aren't open right now.");

  const wait = await cooldownRemaining(input.deviceId);
  if (wait > 0)
    return { ok: false, status: 429, error: "You can only request one song every 5 minutes.", cooldown: wait };

  const supabase = createServiceClient();
  const deviceHash = hashValue(input.deviceId);

  const [{ count: waiting }, { count: mine }] = await Promise.all([
    supabase.from("song_requests").select("id", { count: "exact", head: true }).eq("status", "queued"),
    supabase
      .from("song_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued")
      .eq("device_hash", deviceHash),
  ]);
  if ((waiting ?? 0) >= settings.max_queue)
    return fail(429, "The queue is full right now. Try again in a little while.");
  if ((mine ?? 0) >= settings.per_device_limit)
    return fail(429, `You already have ${settings.per_device_limit} songs waiting. Try again once one has played.`);

  // Re-check against Spotify: the explicit flag from the browser is never trusted.
  let track;
  try {
    track = await getTrack(input.trackId);
  } catch (e) {
    if (e instanceof SpotifyError && e.code === "not_found") return fail(404, "We couldn't find that song.");
    return fail(503, "Song requests are having a moment. Please try again shortly.");
  }
  if (track.explicit) return fail(422, "Explicit songs can't be requested.");

  // Claim the slot first (the unique index makes a duplicate request lose),
  // then queue it; if Spotify refuses, release the slot.
  const { data: row, error } = await supabase
    .from("song_requests")
    .insert({
      spotify_track_id: track.id,
      title: track.title,
      artist: track.artist,
      artwork_url: track.artwork,
      device_hash: deviceHash,
      ip_hash: hashValue(`ip:${input.ip}`),
    })
    .select("id, spotify_track_id, title, artist, artwork_url, status, created_at")
    .single();
  if (error) {
    if (error.code === "23505") return fail(409, "That song is already in the queue.");
    return fail(500, "Couldn't save your request. Please try again.");
  }

  try {
    await addToQueue(track.id);
  } catch (e) {
    await supabase.from("song_requests").delete().eq("id", row.id);
    const msg =
      e instanceof SpotifyError && e.code === "no_device"
        ? "The music isn't ready to take requests yet. Please try again in a moment."
        : "Song requests are having a moment. Please try again shortly.";
    console.error("song request queue add failed:", e);
    return fail(503, msg);
  }

  return { ok: true, request: row as SongRequestRow, cooldown: COOLDOWN_SECONDS };
}
