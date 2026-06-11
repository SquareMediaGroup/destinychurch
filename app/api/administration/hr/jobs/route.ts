import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { slugify } from "@/lib/jobs";
import { requireUser } from "@/lib/apiAuth";

export async function GET() {
  const denied = await requireUser();
  if (denied) return denied;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Build a slug that doesn't collide with existing rows.
async function uniqueSlug(
  supabase: ReturnType<typeof createServiceClient>,
  base: string,
): Promise<string> {
  const root = slugify(base) || "role";
  let slug = root;
  let n = 2;
  // Cap attempts so a pathological case can't loop forever.
  for (let i = 0; i < 50; i++) {
    const { data } = await supabase.from("jobs").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${root}-${n++}`;
  }
  return `${root}-${Date.now()}`;
}

export async function POST(request: Request) {
  const denied = await requireUser();
  if (denied) return denied;

  const body = await request.json();
  const title = body.title?.trim();

  if (!title) {
    return NextResponse.json({ error: "A job title is required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const slug = await uniqueSlug(supabase, body.slug?.trim() || title);

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      title,
      slug,
      kind: body.kind || "job",
      department: body.department?.trim() || null,
      employment_type: body.employment_type || "full_time",
      location: body.location?.trim() || null,
      hours: body.hours?.trim() || null,
      salary: body.salary?.trim() || null,
      summary: body.summary?.trim() || null,
      description: body.description?.trim() || null,
      closing_date: body.closing_date || null,
      is_published: body.is_published ?? false,
      sort_order: body.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
