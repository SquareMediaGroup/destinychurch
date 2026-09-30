// Event song requests: settings, queue reads, and the request rules.
// The rules live here, not in the route, so they can be unit tested.

import { createHash } from "crypto";
import { createServiceClient } from "@/utils/supabase/service";
import { addToQueue, currentlyPlaying, getTrack, SpotifyError } from "@/lib/spotify.server";

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

/**
 * Reads the queue for the public page. Whatever is playing right now has
 * obviously been picked up, so a queued request for that track becomes
 * "played"; requests are never resurrected.
 */
export async function getQueueView() {
  const [settings, playing] = await Promise.all([getSettings(), currentlyPlaying()]);
  if (playing) {
    await createServiceClient()
      .from("song_requests")
      .update({ status: "played" })
      .eq("spotify_track_id", playing.id)
      .eq("status", "queued");
  }
  const requests = await listRequests();
  return { settings, playing, requests };
}

export type RequestOutcome =
  | { ok: true; request: SongRequestRow }
  | { ok: false; status: number; error: string };

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

  return { ok: true, request: row as SongRequestRow };
}
