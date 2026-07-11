import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { slugify } from "@/lib/jobs";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, variants:product_variants(*)")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Build a slug that doesn't collide with existing products.
async function uniqueSlug(
  supabase: ReturnType<typeof createServiceClient>,
  base: string,
): Promise<string> {
  const root = slugify(base) || "product";
  let slug = root;
  let n = 2;
  for (let i = 0; i < 50; i++) {
    const { data } = await supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${root}-${n++}`;
  }
  return `${root}-${Date.now()}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "A product name is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const slug = await uniqueSlug(supabase, body.slug?.trim() || name);

  const { data, error } = await supabase
    .from("products")
    .insert({
      name,
      slug,
      description: body.description?.trim() || null,
      base_price_pennies: Number.isFinite(body.base_price_pennies)
        ? Math.max(0, Math.round(body.base_price_pennies))
        : 0,
      category: body.category?.trim() || null,
      fit: body.fit || "unisex",
      product_type: body.product_type || "clothing",
      is_published: body.is_published ?? false,
      is_featured: body.is_featured ?? false,
      sort_order: body.sort_order ?? 0,
    })
    .select("*, variants:product_variants(*)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
