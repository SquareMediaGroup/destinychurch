import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

// Edits replace every item: delete-all-and-reinsert, the simplest correct
// approach at the size a checklist template actually is (a handful of rows).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.kind === "string") update.kind = body.kind;

  const supabase = createServiceClient();

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("hr_checklist_templates").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (Array.isArray(body.items)) {
    const { error: deleteError } = await supabase
      .from("hr_checklist_template_items")
      .delete()
      .eq("template_id", id);
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

    const items: string[] = body.items
      .map((i: { label?: string }) => i.label?.trim())
      .filter(Boolean);
    if (items.length > 0) {
      const { error: insertError } = await supabase.from("hr_checklist_template_items").insert(
        items.map((label, i) => ({ template_id: id, label, sort_order: i })),
      );
      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  const { data, error } = await supabase
    .from("hr_checklist_templates")
    .select("*, hr_checklist_template_items(id, template_id, label, sort_order)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("hr_checklist_templates").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
