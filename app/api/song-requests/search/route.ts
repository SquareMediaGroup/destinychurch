// Public: search Spotify for requestable (non-explicit) tracks.

import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { searchTracks } from "@/lib/spotify.server";
import { getSettings } from "@/lib/songRequests.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (checkRateLimit(`songreq-search:${clientIp(request)}`, 40).limited)
    return NextResponse.json({ error: "Too many searches. Try again shortly." }, { status: 429 });

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 100) return NextResponse.json({ tracks: [] });
  if (!(await getSettings()).open) return NextResponse.json({ tracks: [] });

  try {
    const tracks = await searchTracks(q);
    return NextResponse.json({
      tracks: tracks.map((t) => ({ id: t.id, title: t.title, artist: t.artist, artwork: t.artwork })),
    });
  } catch (e) {
    console.error("song search failed:", e);
    return NextResponse.json({ error: "Search isn't working right now." }, { status: 503 });
  }
}
