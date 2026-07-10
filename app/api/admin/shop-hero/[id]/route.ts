import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

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

  const { data, error } = await supabase
    .from("shop_hero_slides")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE — remove a slide and its uploaded image.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("shop_hero_slides")
    .select("image_path")
    .eq("id", id)
    .maybeSingle();

  if (existing?.image_path) {
    await supabase.storage
      .from("shop-hero-images")
      .remove([existing.image_path]);
  }

  const { error } = await supabase
    .from("shop_hero_slides")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
