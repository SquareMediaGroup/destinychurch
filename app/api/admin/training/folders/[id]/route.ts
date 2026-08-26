import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";

const EDITABLE = ["name", "sort_order", "subgroup_id"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, any> = {};
  for (const key of EDITABLE) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const before = await readForAudit("training_folders", id);
  const { data, error } = await supabase
    .from("training_folders")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "update",
    section: "training",
    entity: "training folder",
    entityId: id,
    entityLabel: data.name,
    summary: `Edited the training folder “${data.name}”`,
    before,
    after: updates,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("training_folders", id);
  const { error } = await supabase.from("training_folders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "training",
    entity: "training folder",
    entityId: id,
    entityLabel: (before?.name as string) ?? null,
    summary: `Deleted the training folder “${before?.name ?? id}”`,
    before,
  });

  return new NextResponse(null, { status: 204 });
}
