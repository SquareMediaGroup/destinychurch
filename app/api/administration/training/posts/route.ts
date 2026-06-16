import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { slugify } from "@/lib/jobs";

export async function GET(request: Request) {
  const subgroupId = new URL(request.url).searchParams.get("subgroup_id");
  const supabase = createServiceClient();
  let query = supabase
    .from("training_posts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (subgroupId) query = query.eq("subgroup_id", subgroupId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Slug only needs to be unique within its sub-group.
async function uniqueSlug(
  supabase: ReturnType<typeof createServiceClient>,
  subgroupId: string,
  base: string,
): Promise<string> {
  const root = slugify(base) || "post";
  let slug = root;
  let n = 2;
  for (let i = 0; i < 50; i++) {
    const { data } = await supabase
      .from("training_posts")
      .select("id")
      .eq("subgroup_id", subgroupId)
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    slug = `${root}-${n++}`;
  }
  return `${root}-${Date.now()}`;
}

export async function POST(request: Request) {
  const body = await request.json();
  const title = body.title?.trim();
  const subgroupId = body.subgroup_id;

  if (!title) {
    return NextResponse.json({ error: "A post title is required" }, { status: 400 });
  }
  if (!subgroupId) {
    return NextResponse.json({ error: "A sub-group is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const slug = await uniqueSlug(supabase, subgroupId, body.slug?.trim() || title);

  const { data, error } = await supabase
    .from("training_posts")
    .insert({
      subgroup_id: subgroupId,
      title,
      slug,
      summary: body.summary?.trim() || null,
      body: body.body?.trim() || null,
      is_published: body.is_published ?? false,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
