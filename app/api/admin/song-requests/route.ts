// Admin: song-request settings, connection status and the request list.
// Guarded by middleware (event_admin) — see lib/adminRoles.ts.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getSettings, listRequests } from "@/lib/songRequests.server";
import { recordAudit } from "@/lib/audit.server";
import { activeDevice, connectionStatus, spotifyConfigured } from "@/lib/spotify.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const connection = await connectionStatus();
  const [settings, requests, device] = await Promise.all([
    getSettings(),
    listRequests(100),
    connection ? activeDevice() : Promise.resolve(null),
  ]);
  return NextResponse.json({
    configured: spotifyConfigured(),
    connection,
    device,
    settings,
    requests: requests.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.artist,
      status: r.status,
      createdAt: r.created_at,
    })),
  });
}

export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.open === "boolean") patch.open = body.open;
  if (typeof body.eventName === "string") {
    const name = body.eventName.trim();
    if (name.length < 1 || name.length > 80)
      return NextResponse.json({ error: "Event name must be 1-80 characters." }, { status: 400 });
    patch.event_name = name;
  }
  for (const [key, col, max] of [
    ["maxQueue", "max_queue", 200],
    ["perDeviceLimit", "per_device_limit", 50],
  ] as const) {
    if (body[key] === undefined) continue;
    const n = Number(body[key]);
    if (!Number.isInteger(n) || n < 1 || n > max)
      return NextResponse.json({ error: `${key} must be between 1 and ${max}.` }, { status: 400 });
    patch[col] = n;
  }

  const { error } = await createServiceClient().from("song_request_settings").update(patch).eq("id", 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary =
    typeof body.open === "boolean"
      ? `${body.open ? "Opened" : "Closed"} song requests`
      : "Edited song request settings";
  await recordAudit({
    action: "update",
    section: "announcements",
    entity: "song requests",
    entityId: 1,
    entityLabel: typeof patch.event_name === "string" ? patch.event_name : "Song requests",
    summary,
    after: patch,
  });
  return NextResponse.json({ ok: true });
}
