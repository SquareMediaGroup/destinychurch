import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { slugify } from "@/lib/jobs";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("training_categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Build a slug that doesn't collide with existing rows.
async function uniqueSlug(
  supabase: ReturnType<typeof createServiceClient>,
  base: string,
): Promise<string> {
  const root = slugify(base) || "category";
  let slug = root;
  let n = 2;
  for (let i = 0; i < 50; i++) {
    const { data } = await supabase
      .from("training_categories")
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
    return NextResponse.json({ error: "A category name is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const slug = await uniqueSlug(supabase, body.slug?.trim() || name);

  const { data, error } = await supabase
    .from("training_categories")
    .insert({
      name,
      slug,
      description: body.description?.trim() || null,
      icon: body.icon?.trim() || null,
      is_published: body.is_published ?? true,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
