import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";

/** Removes a saved template. Posts already made from it are untouched. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("post_templates", templateId, "id, label, description, created_by");
  if (!before) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  const { error } = await supabase.from("post_templates").delete().eq("id", templateId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordAudit({
    action: "delete",
    section: "posts",
    entity: "post template",
    entityId: templateId,
    entityLabel: (before.label as string) ?? null,
    summary: `Deleted the post template “${before.label ?? templateId}”`,
    before,
  });
  return NextResponse.json({ ok: true });
}
