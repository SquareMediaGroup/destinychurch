import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

// GET /api/admin/builder/pages — list all builder pages
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("builder_pages")
    .select(
      "id, slug, title, status, source_type, source_path, repo_commit, created_at, updated_at, published_at"
    )
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pages: data ?? [] });
}

// POST /api/admin/builder/pages — create new page
export async function POST(request: Request) {
  const body = await request.json();
  const { slug, title, layout_json } = body;

  if (!slug || !title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("builder_pages")
    .insert({
      slug,
      title,
      layout_json: layout_json ?? [],
      status: "draft",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}
