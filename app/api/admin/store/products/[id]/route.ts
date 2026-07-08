import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { slugify } from "@/lib/jobs";
import type { ProductImage } from "@/lib/shop";

type IncomingVariant = {
  id?: string;
  size?: string;
  color?: string;
  color_hex?: string | null;
  sku?: string | null;
  price_pennies?: number | null;
  stock?: number;
  is_active?: boolean;
  sort_order?: number;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

const EDITABLE = [
  "name",
  "description",
  "base_price_pennies",
  "category",
  "images",
  "is_published",
  "is_featured",
  "sort_order",
] as const;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServiceClient();

  const update: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) update[key] = body[key];
  }
  if ("base_price_pennies" in update) {
    update.base_price_pennies = Math.max(
      0,
      Math.round(Number(update.base_price_pennies) || 0),
    );
  }
  if ("images" in update && !Array.isArray(update.images)) {
    update.images = [] as ProductImage[];
  }

  // Allow an explicit slug change, keeping it unique against other products.
  if (typeof body.slug === "string" && body.slug.trim()) {
    const root = slugify(body.slug) || "product";
    let slug = root;
    let n = 2;
    for (let i = 0; i < 50; i++) {
      const { data } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .neq("id", id)
        .maybeSingle();
      if (!data) break;
      slug = `${root}-${n++}`;
    }
    update.slug = slug;
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("products").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Reconcile variants (upsert incoming, delete the ones the admin removed).
  if (Array.isArray(body.variants)) {
    const incoming = body.variants as IncomingVariant[];

    const { data: existing } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", id);
    const existingIds = new Set((existing ?? []).map((v) => v.id as string));
    const keptIds = new Set(
      incoming.map((v) => v.id).filter((v): v is string => Boolean(v)),
    );

    // Delete removed variants.
    const toDelete = [...existingIds].filter((vid) => !keptIds.has(vid));
    if (toDelete.length > 0) {
      const { error } = await supabase
        .from("product_variants")
        .delete()
        .in("id", toDelete);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Upsert incoming variants.
    for (let i = 0; i < incoming.length; i++) {
      const v = incoming[i];
      const row = {
        product_id: id,
        size: (v.size ?? "").trim(),
        color: (v.color ?? "").trim(),
        color_hex: v.color_hex?.trim() || null,
        sku: v.sku?.trim() || null,
        price_pennies:
          v.price_pennies === null || v.price_pennies === undefined
            ? null
            : Math.max(0, Math.round(Number(v.price_pennies))),
        stock: Math.max(0, Math.round(Number(v.stock) || 0)),
        is_active: v.is_active ?? true,
        sort_order: v.sort_order ?? i,
      };

      if (v.id && existingIds.has(v.id)) {
        const { error } = await supabase
          .from("product_variants")
          .update(row)
          .eq("id", v.id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      } else {
        const { error } = await supabase.from("product_variants").insert(row);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  const { data, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
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

  // Remove product images from storage first (best-effort).
  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", id)
    .maybeSingle();
  const images = (product?.images ?? []) as ProductImage[];
  const paths = images.map((img) => img.path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("product-images").remove(paths);
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
