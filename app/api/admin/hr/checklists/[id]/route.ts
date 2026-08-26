import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";

// Toggle done, edit the label/notes/due date, or add a one-off item to an
// individual's already-started checklist.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if (typeof body.is_done === "boolean") {
    update.is_done = body.is_done;
    update.done_at = body.is_done ? new Date().toISOString() : null;
  }
  for (const key of ["label", "due_date", "notes"]) {
    if (key in body) update[key] = body[key];
  }

  const supabase = createServiceClient();
  const before = await readForAudit("hr_checklist_items", id);
  const { data, error } = await supabase
    .from("hr_checklist_items")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ticked = typeof body.is_done === "boolean";
  await recordAudit({
    action: "update",
    section: "hr",
    entity: "checklist item",
    entityId: id,
    entityLabel: data.label,
    summary: ticked
      ? `${data.is_done ? "Ticked off" : "Un-ticked"} the ${data.kind} checklist item “${data.label}”`
      : `Edited the ${data.kind} checklist item “${data.label}”`,
    before,
    after: update,
    redactFields: ["notes"],
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("hr_checklist_items", id);
  const { error } = await supabase.from("hr_checklist_items").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "hr",
    entity: "checklist item",
    entityId: id,
    entityLabel: (before?.label as string) ?? null,
    summary: `Deleted the checklist item “${before?.label ?? id}”`,
    before,
    redactFields: ["notes"],
  });

  return NextResponse.json({ success: true });
}
