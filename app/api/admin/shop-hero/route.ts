import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";

// GET — list all hero slides (published or not) in display order, for the admin.
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("shop_hero_slides")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — create a new slide, appended after the current last one.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const supabase = createServiceClient();

  const { data: last } = await supabase
    .from("shop_hero_slides")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payload = {
    active: body.active ?? true,
    heading: body.heading || null,
    subheading: body.subheading || null,
    cta_text: body.cta_text || null,
    cta_link: body.cta_link || null,
    image_url: body.image_url || null,
    image_path: body.image_path || null,
    sort_order: (last?.sort_order ?? -1) + 1,
  };

  const { data, error } = await supabase
    .from("shop_hero_slides")
    .insert(payload)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "create",
    section: "store",
    entity: "shop hero slide",
    entityId: data.id,
    entityLabel: data.heading || "Untitled slide",
    summary: `Added the shop hero slide “${data.heading || "Untitled slide"}”`,
    after: data,
  });

  return NextResponse.json(data);
}
