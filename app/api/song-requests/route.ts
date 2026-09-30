// Public: read the song-request queue, and request a track.
// Nothing in the body is trusted: the track is looked up again on Spotify and
// explicit songs are refused here, whatever the page showed.

import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { cooldownRemaining, getQueueView, requestTrack } from "@/lib/songRequests.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (checkRateLimit(`songreq-read:${clientIp(request)}`, 60).limited)
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  const device = new URL(request.url).searchParams.get("device");
  const [{ settings, playing, requests }, cooldown] = await Promise.all([
    getQueueView(),
    cooldownRemaining(device),
  ]);
  return NextResponse.json({
    cooldown,
    open: settings.open,
    eventName: settings.event_name,
    playing,
    requests: requests.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      artwork: r.artwork_url,
      status: r.status,
    })),
  });
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  if (checkRateLimit(`songreq:${ip}`, 8).limited)
    return NextResponse.json({ error: "Slow down a little and try again shortly." }, { status: 429 });

  const body = (await request.json().catch(() => null)) as {
    trackId?: unknown;
    deviceId?: unknown;
    website?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "That song isn't available." }, { status: 400 });

  // Honeypot: a person never sees this field.
  if (typeof body.website === "string" && body.website.trim() !== "")
    return NextResponse.json({ ok: true });

  const outcome = await requestTrack({ trackId: body.trackId, deviceId: body.deviceId, ip });
  if (!outcome.ok)
    return NextResponse.json({ error: outcome.error, cooldown: outcome.cooldown ?? 0 }, { status: outcome.status });
  return NextResponse.json({ ok: true, cooldown: outcome.cooldown });
}
