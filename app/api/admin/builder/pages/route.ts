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

// POST /api/admin/builder/pages — create new page (JSON builder)
export async function POST(request: Request) {
  const body = await request.json();
  const { slug, title, layout_json, template_id } = body as {
    slug?: string;
    title?: string;
    layout_json?: unknown;
    template_id?: string;
  };

  if (!slug || !title) {
    return NextResponse.json({ error: "slug and title are required" }, { status: 400 });
  }
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(slug)) {
    return NextResponse.json(
      { error: "Slug must be lowercase letters, numbers, and hyphens" },
      { status: 400 }
    );
  }

  // Resolve template_id -> initial layout (server-side so the client can't
  // forge arbitrary element shapes via this endpoint).
  let initialLayout: unknown = Array.isArray(layout_json) ? layout_json : [];
  if (template_id) {
    const { getTemplate } = await import("@/lib/builder/templates");
    const tpl = getTemplate(template_id);
    if (!tpl) {
      return NextResponse.json({ error: `Unknown template: ${template_id}` }, { status: 400 });
    }
    initialLayout = tpl.build();
  }

  const supabase = createServiceClient();

  // Reject duplicate slugs up front with a clearer message than the DB error.
  const { data: existing } = await supabase
    .from("builder_pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: `A page with slug "${slug}" already exists` },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from("builder_pages")
    .insert({
      slug,
      title,
      layout_json: initialLayout,
      status: "draft",
      source_type: "json",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}
