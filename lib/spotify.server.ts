// Spotify Web API helpers for event song requests. Server-only.
//
// Two kinds of access:
//   - app token (Client Credentials): search and track lookup, no user needed;
//   - user token (refresh token of the church's Premium account, stored once by
//     an admin): add to the live queue, read what is playing, list devices.

import { createServiceClient } from "@/utils/supabase/service";

const API = "https://api.spotify.com/v1";
const ACCOUNTS = "https://accounts.spotify.com";

export const SPOTIFY_SCOPES =
  "user-modify-playback-state user-read-playback-state user-read-currently-playing";

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  explicit: boolean;
  durationMs: number;
}

export class SpotifyError extends Error {
  constructor(
    message: string,
    public code: "not_connected" | "no_device" | "failed" | "not_found",
  ) {
    super(message);
  }
}

export function spotifyConfigured() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

function basicAuth() {
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new SpotifyError("Spotify is not configured", "failed");
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export function redirectUri(origin: string) {
  return process.env.SPOTIFY_REDIRECT_URI || `${origin}/api/admin/song-requests/spotify/callback`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!res.ok) throw new SpotifyError(`Spotify token request failed (${res.status})`, "failed");
  return (await res.json()) as { access_token: string; expires_in: number; refresh_token?: string };
}

// ── Tokens ──────────────────────────────────────────────────────────────────

let appToken: { value: string; expires: number } | null = null;
let userToken: { value: string; expires: number } | null = null;

async function getAppToken() {
  if (appToken && appToken.expires > Date.now() + 30_000) return appToken.value;
  const t = await tokenRequest({ grant_type: "client_credentials" });
  appToken = { value: t.access_token, expires: Date.now() + t.expires_in * 1000 };
  return appToken.value;
}

async function getUserToken() {
  if (userToken && userToken.expires > Date.now() + 30_000) return userToken.value;
  const { data } = await createServiceClient()
    .from("song_request_spotify")
    .select("refresh_token")
    .eq("id", 1)
    .maybeSingle();
  if (!data?.refresh_token) throw new SpotifyError("Spotify account not connected", "not_connected");
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: data.refresh_token });
  if (t.refresh_token && t.refresh_token !== data.refresh_token) {
    await createServiceClient()
      .from("song_request_spotify")
      .update({ refresh_token: t.refresh_token })
      .eq("id", 1);
  }
  userToken = { value: t.access_token, expires: Date.now() + t.expires_in * 1000 };
  return userToken.value;
}

/** Exchanges the OAuth code from the callback and stores the refresh token. */
export async function connectAccount(code: string, origin: string) {
  const t = await tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(origin),
  });
  if (!t.refresh_token) throw new SpotifyError("Spotify did not return a refresh token", "failed");
  const me = await fetch(`${API}/me`, {
    headers: { Authorization: `Bearer ${t.access_token}` },
    cache: "no-store",
  }).then((r) => (r.ok ? r.json() : null));
  await createServiceClient().from("song_request_spotify").upsert({
    id: 1,
    refresh_token: t.refresh_token,
    account_name: me?.display_name ?? me?.id ?? null,
    connected_at: new Date().toISOString(),
  });
  userToken = { value: t.access_token, expires: Date.now() + t.expires_in * 1000 };
}

// ── Tracks ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTrack(t: any): SpotifyTrack | null {
  if (!t || typeof t.id !== "string" || t.type !== "track") return null;
  const images: { url: string; width: number }[] = t.album?.images ?? [];
  // Smallest image that is still at least 64px wide.
  const art = [...images].sort((a, b) => a.width - b.width).find((i) => i.width >= 64) ?? images[0];
  return {
    id: t.id,
    title: String(t.name ?? ""),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    artist: (t.artists ?? []).map((a: any) => a.name).join(", "),
    artwork: art?.url ?? null,
    explicit: t.explicit !== false, // unknown counts as explicit
    durationMs: Number(t.duration_ms ?? 0),
  };
}

// Spotify caps a search page at 10 results. Explicit tracks are dropped after,
// so two pages are read to leave a useful list.
const SEARCH_PAGE = 10;

async function searchPage(query: string, token: string, offset: number): Promise<unknown[]> {
  const res = await fetch(
    `${API}/search?${new URLSearchParams({ q: query, type: "track", limit: String(SEARCH_PAGE), offset: String(offset) })}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!res.ok) throw new SpotifyError(`Spotify search failed (${res.status})`, "failed");
  const json = await res.json();
  return json.tracks?.items ?? [];
}

/** Search results with explicit tracks removed. */
export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  const token = await getAppToken();
  const pages = await Promise.all([0, SEARCH_PAGE].map((o) => searchPage(query, token, o)));
  const seen = new Set<string>();
  return pages
    .flat()
    .map(toTrack)
    .filter((t): t is SpotifyTrack => t !== null && !t.explicit && !seen.has(t.id) && !!seen.add(t.id))
    .slice(0, 12);
}

export async function getTrack(id: string): Promise<SpotifyTrack> {
  const token = await getAppToken();
  const res = await fetch(`${API}/tracks/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 400 || res.status === 404) throw new SpotifyError("Track not found", "not_found");
  if (!res.ok) throw new SpotifyError(`Spotify track lookup failed (${res.status})`, "failed");
  const track = toTrack(await res.json());
  if (!track) throw new SpotifyError("Track not found", "not_found");
  return track;
}

// ── Player (church account) ─────────────────────────────────────────────────

export async function addToQueue(trackId: string) {
  const token = await getUserToken();
  const res = await fetch(
    `${API}/me/player/queue?${new URLSearchParams({ uri: `spotify:track:${trackId}` })}`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (res.ok) return;
  if (res.status === 404) throw new SpotifyError("No active Spotify device", "no_device");
  throw new SpotifyError(`Spotify queue add failed (${res.status})`, "failed");
}

export async function currentlyPlaying(): Promise<{ id: string; title: string; artist: string; artwork: string | null } | null> {
  try {
    const token = await getUserToken();
    const res = await fetch(`${API}/me/player/currently-playing`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (res.status !== 200) return null;
    const json = await res.json();
    const t = toTrack(json.item);
    return t ? { id: t.id, title: t.title, artist: t.artist, artwork: t.artwork } : null;
  } catch {
    return null;
  }
}

/**
 * What is playing and what is queued on the church account, straight from
 * Spotify, so songs added in the Spotify app show up too. Null when Spotify
 * can't answer (not connected, no active player).
 */
export async function getQueue(): Promise<{ playing: SpotifyTrack | null; queue: SpotifyTrack[] } | null> {
  try {
    const token = await getUserToken();
    const res = await fetch(`${API}/me/player/queue`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      playing: toTrack(json.currently_playing),
      queue: ((json.queue ?? []) as unknown[]).map(toTrack).filter((t): t is SpotifyTrack => t !== null),
    };
  } catch {
    return null;
  }
}

export async function activeDevice(): Promise<string | null> {
  try {
    const token = await getUserToken();
    const res = await fetch(`${API}/me/player/devices`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = (json.devices ?? []).find((x: any) => x.is_active);
    return d?.name ?? null;
  } catch {
    return null;
  }
}

export async function connectionStatus() {
  const { data } = await createServiceClient()
    .from("song_request_spotify")
    .select("account_name, connected_at")
    .eq("id", 1)
    .maybeSingle();
  return data ? { accountName: data.account_name as string | null, connectedAt: data.connected_at as string } : null;
}
