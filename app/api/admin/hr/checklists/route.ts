import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staff_id");
  const kind = searchParams.get("kind");

  const supabase = createServiceClient();
  let query = supabase.from("hr_checklist_items").select("*").order("sort_order");
  if (staffId) query = query.eq("staff_id", staffId);
  if (kind) query = query.eq("kind", kind);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Starts a checklist for a staff member: instantiates from a template
// (copy-and-decouple — editing the template afterward never changes an
// already-started staff checklist), or starts blank with ad-hoc items.
export async function POST(request: Request) {
  const body = await request.json();

  if (!body.staff_id || !body.kind) {
    return NextResponse.json({ error: "staff_id and kind are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  let items: { label: string }[] = [];

  if (body.template_id) {
    const { data: templateItems, error } = await supabase
      .from("hr_checklist_template_items")
      .select("label, sort_order")
      .eq("template_id", body.template_id)
      .order("sort_order");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    items = templateItems ?? [];
  } else if (Array.isArray(body.items)) {
    items = body.items
      .map((i: { label?: string }) => ({ label: i.label?.trim() }))
      .filter((i: { label?: string }) => i.label);
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: "Provide a template_id or at least one item." },
      { status: 400 },
    );
  }

  // Append after whatever's already on this staff member's checklist, so
  // adding one ad-hoc item to an in-progress checklist doesn't renumber it.
  const { data: existing } = await supabase
    .from("hr_checklist_items")
    .select("sort_order")
    .eq("staff_id", body.staff_id)
    .eq("kind", body.kind)
    .order("sort_order", { ascending: false })
    .limit(1);
  const startAt = existing?.[0] ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("hr_checklist_items")
    .insert(
      items.map((item, i) => ({
        staff_id: body.staff_id,
        kind: body.kind,
        label: item.label,
        sort_order: startAt + i,
      })),
    )
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
