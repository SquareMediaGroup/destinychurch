import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: playlistId } = await params;

  const before = await readForAudit("sermon_series", playlistId, "*", "playlist_id");
  if (!before) {
    return NextResponse.json({ error: "Series not found" }, { status: 404 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("sermon_series").delete().eq("playlist_id", playlistId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordAudit({
    action: "delete",
    section: "sermons",
    entity: "sermon series",
    entityId: playlistId,
    entityLabel: playlistId,
    summary: `Removed the sermon series (playlist ${playlistId})`,
    before,
  });

  return NextResponse.json({ ok: true });
}
