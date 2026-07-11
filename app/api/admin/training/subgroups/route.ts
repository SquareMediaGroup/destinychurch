import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { slugify } from "@/lib/jobs";
import { hashPassword } from "@/lib/trainingAccess";

// Strip password_hash from any row before it leaves the server; expose only
// whether a password is set.
type Row = Record<string, unknown> & { password_hash?: string | null };
function toPublic(row: Row) {
  const { password_hash, ...rest } = row;
  return { ...rest, has_password: !!password_hash };
}

export async function GET(request: Request) {
  const categoryId = new URL(request.url).searchParams.get("category_id");
  const supabase = createServiceClient();
  let query = supabase
    .from("training_subgroups")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (categoryId) query = query.eq("category_id", categoryId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data as Row[]).map(toPublic));
}

// Slug only needs to be unique within its category.
async function uniqueSlug(
  supabase: ReturnType<typeof createServiceClient>,
  categoryId: string,
  base: string,
): Promise<string> {
  const root = slugify(base) || "group";
  let slug = root;
  let n = 2;
  for (let i = 0; i < 50; i++) {
    const { data } = await supabase
      .from("training_subgroups")
      .select("id")
      .eq("category_id", categoryId)
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
  const categoryId = body.category_id;

  if (!name) {
    return NextResponse.json({ error: "A sub-group name is required" }, { status: 400 });
  }
  if (!categoryId) {
    return NextResponse.json({ error: "A category is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const slug = await uniqueSlug(supabase, categoryId, body.slug?.trim() || name);

  const password = typeof body.password === "string" ? body.password : "";

  const { data, error } = await supabase
    .from("training_subgroups")
    .insert({
      category_id: categoryId,
      name,
      slug,
      description: body.description?.trim() || null,
      password_hash: password ? hashPassword(password) : null,
      is_published: body.is_published ?? true,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(toPublic(data as Row), { status: 201 });
}
