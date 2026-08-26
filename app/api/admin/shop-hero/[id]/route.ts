import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";

// PATCH — update a slide's fields (content, active flag and/or sort_order).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const supabase = createServiceClient();

  // If the image is being replaced or cleared, remove the old file from storage.
  const { data: existing } = await supabase
    .from("shop_hero_slides")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  const payload: Record<string, unknown> = {};
  if ("active" in body) payload.active = !!body.active;
  if ("heading" in body) payload.heading = body.heading || null;
  if ("subheading" in body) payload.subheading = body.subheading || null;
  if ("cta_text" in body) payload.cta_text = body.cta_text || null;
  if ("cta_link" in body) payload.cta_link = body.cta_link || null;
  if ("image_url" in body) payload.image_url = body.image_url || null;
  if ("image_path" in body) payload.image_path = body.image_path || null;
  if ("sort_order" in body) payload.sort_order = body.sort_order;

  if (
    "image_path" in body &&
    existing?.image_path &&
    existing.image_path !== (body.image_path || null)
  ) {
    await supabase.storage
      .from("shop-hero-images")
      .remove([existing.image_path]);
  }

  const before = await readForAudit("shop_hero_slides", id);

  const { data, error } = await supabase
    .from("shop_hero_slides")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Reordering is a drag of the handle, not an edit — one PATCH per slide.
  // Saying so keeps a reorder from reading like five content changes.
  const reorderOnly = Object.keys(payload).length === 1 && "sort_order" in payload;
  const label = data.heading || "Untitled slide";

  await recordAudit({
    action: "update",
    section: "store",
    entity: "shop hero slide",
    entityId: id,
    entityLabel: label,
    summary: reorderOnly
      ? `Reordered the shop hero slide “${label}”`
      : `Edited the shop hero slide “${label}”`,
    before,
    after: { ...payload },
  });

  return NextResponse.json(data);
}

// DELETE — remove a slide and its uploaded image.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const existing = await readForAudit("shop_hero_slides", id);

  if (existing?.image_path) {
    await supabase.storage
      .from("shop-hero-images")
      .remove([existing.image_path as string]);
  }

  const { error } = await supabase
    .from("shop_hero_slides")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "store",
    entity: "shop hero slide",
    entityId: id,
    entityLabel: (existing?.heading as string) || "Untitled slide",
    summary: `Deleted the shop hero slide “${existing?.heading || "Untitled slide"}”`,
    before: existing,
  });

  return NextResponse.json({ success: true });
}
