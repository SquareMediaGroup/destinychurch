import { test, expect } from "@playwright/test";

process.env.SPOTIFY_CLIENT_ID = "id";
process.env.SPOTIFY_CLIENT_SECRET = "secret";

import { getTrack, searchTracks } from "../../lib/spotify.server";
import { hashValue } from "../../lib/songRequests.server";

/**
 * The one hard rule of song requests: explicit songs never get through. The
 * filter runs on the server, so these tests pin it, including the case where
 * Spotify leaves the flag out (unknown counts as explicit).
 */

const track = (id: string, explicit: boolean | undefined) => ({
  id,
  type: "track",
  name: `Song ${id}`,
  explicit,
  duration_ms: 1000,
  artists: [{ name: "Artist" }],
  album: { images: [{ url: "https://img/1", width: 64 }] },
});

const realFetch = globalThis.fetch;
function mockSpotify(routes: { search?: unknown[]; track?: unknown; trackStatus?: number }) {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = String(input);
    const json = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
    if (url.includes("/api/token")) return json({ access_token: "t", expires_in: 3600 });
    if (url.includes("/search")) return json({ tracks: { items: routes.search ?? [] } });
    if (url.includes("/tracks/")) return json(routes.track ?? {}, routes.trackStatus ?? 200);
    return json({}, 404);
  }) as typeof fetch;
}
test.afterEach(() => {
  globalThis.fetch = realFetch;
});

test("search drops explicit tracks and tracks with no explicit flag", async () => {
  mockSpotify({ search: [track("clean1", false), track("dirty1", true), track("unknown1", undefined)] });
  const out = await searchTracks("anything");
  expect(out.map((t) => t.id)).toEqual(["clean1"]);
});

test("a track lookup reports explicit so the request can be refused", async () => {
  mockSpotify({ track: track("dirty1", true) });
  expect((await getTrack("dirty1")).explicit).toBe(true);
  mockSpotify({ track: track("clean1", false) });
  expect((await getTrack("clean1")).explicit).toBe(false);
});

test("an unknown track id is not found", async () => {
  mockSpotify({ trackStatus: 404 });
  await expect(getTrack("nope")).rejects.toMatchObject({ code: "not_found" });
});

test("device and ip hashes are stable and do not contain the input", () => {
  expect(hashValue("abc")).toBe(hashValue("abc"));
  expect(hashValue("abc")).not.toBe(hashValue("abd"));
  expect(hashValue("1.2.3.4")).not.toContain("1.2.3.4");
});
