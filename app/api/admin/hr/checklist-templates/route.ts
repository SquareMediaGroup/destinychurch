import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_checklist_templates")
    .select("*, hr_checklist_template_items(id, template_id, label, sort_order)")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const templates = (data ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    items: ((t.hr_checklist_template_items as unknown[]) ?? []).sort(
      (a: unknown, b: unknown) =>
        (a as { sort_order: number }).sort_order - (b as { sort_order: number }).sort_order,
    ),
    hr_checklist_template_items: undefined,
  }));

  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name?.trim() || !body.kind) {
    return NextResponse.json({ error: "name and kind are required" }, { status: 400 });
  }

  const items: string[] = Array.isArray(body.items)
    ? body.items.map((i: { label?: string }) => i.label?.trim()).filter(Boolean)
    : [];

  const supabase = createServiceClient();
  const { data: template, error } = await supabase
    .from("hr_checklist_templates")
    .insert({ name: body.name.trim(), kind: body.kind })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("hr_checklist_template_items").insert(
      items.map((label, i) => ({ template_id: template.id, label, sort_order: i })),
    );
    if (itemsError) {
      await supabase.from("hr_checklist_templates").delete().eq("id", template.id);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }
  }

  return NextResponse.json(template, { status: 201 });
}
