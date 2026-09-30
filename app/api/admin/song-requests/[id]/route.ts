// Admin: hide a request from the public list. Spotify has no API to take a
// track back out of its queue, so this only affects our list.

import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit.server";
import { createServiceClient } from "@/utils/supabase/service";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  const { data, error } = await createServiceClient()
    .from("song_requests")
    .update({ status: "removed" })
    .eq("id", id)
    .select("title")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordAudit({
    action: "delete",
    section: "announcements",
    entity: "song request",
    entityId: id,
    entityLabel: data?.title ?? null,
    summary: `Removed song request “${data?.title ?? id}” from the public list`,
  });
  return NextResponse.json({ ok: true });
}
