import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { slugify } from "@/lib/jobs";
import { formatPrice, type ProductImage } from "@/lib/shop";
import { readForAudit, recordAudit } from "@/lib/audit.server";

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
  "fit",
  "product_type",
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
  const before = await readForAudit("products", id);
  // Variants are counted rather than diffed: a save re-sends every one of them,
  // so a field-by-field diff would drown the real change (a price, a name) in
  // twenty identical rows. The counts say what actually happened to them.
  const variantDelta = { added: 0, updated: 0, removed: 0 };

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
      variantDelta.removed = toDelete.length;
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
        variantDelta.updated++;
      } else {
        const { error } = await supabase.from("product_variants").insert(row);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        variantDelta.added++;
      }
    }
  }

  const { data, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const published = data.is_published;
  const wasPublished = Boolean(before?.is_published);
  const headline =
    published && !wasPublished
      ? `Published the product “${data.name}”`
      : !published && wasPublished
        ? `Unpublished the product “${data.name}”`
        : `Edited the product “${data.name}”`;
  const variantNote = [
    variantDelta.added ? `${variantDelta.added} variant(s) added` : "",
    variantDelta.removed ? `${variantDelta.removed} removed` : "",
  ]
    .filter(Boolean)
    .join(", ");

  await recordAudit({
    action: "update",
    section: "store",
    entity: "product",
    entityId: id,
    entityLabel: data.name,
    summary: `${headline}${variantNote ? ` — ${variantNote}` : ""}`,
    before,
    // The freshly-read row minus the variants array, which is summarised in
    // metadata instead of diffed field by field.
    after: { ...data, variants: undefined },
    metadata: {
      price: formatPrice(data.base_price_pennies ?? 0),
      variants: variantDelta,
    },
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Remove product images from storage first (best-effort).
  const product = await readForAudit("products", id);
  const images = (product?.images ?? []) as ProductImage[];
  const paths = images.map((img) => img.path).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("product-images").remove(paths);
  }

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // A deleted product is gone from the store, so the whole row goes into the
  // log: this entry is the only remaining record that it ever existed.
  await recordAudit({
    action: "delete",
    section: "store",
    entity: "product",
    entityId: id,
    entityLabel: (product?.name as string) ?? null,
    summary: `Deleted the product “${product?.name ?? id}” from the store`,
    before: product,
    metadata: { images_removed: paths.length },
  });

  return NextResponse.json({ success: true });
}
