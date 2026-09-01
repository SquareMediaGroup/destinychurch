import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { deleteAsset } from "@/lib/playbook.server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("media_photos", id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (before.playbook_asset_token) {
    await deleteAsset(String(before.playbook_asset_token)).catch(() => {});
  }

  const { error } = await supabase.from("media_photos").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "media",
    entity: "photo",
    entityId: id,
    entityLabel: before.file_name ? String(before.file_name) : null,
    summary: `Deleted the photo "${before.file_name ?? id}" uploaded by ${before.uploader_name ?? "someone"}`,
    before,
  });

  return NextResponse.json({ ok: true });
}
