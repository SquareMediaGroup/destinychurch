import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { createDocument } from "@/packages/studio-schema/src/types";
import { DEFAULT_TOKENS } from "@/packages/studio-tokens/src/defaults";

// GET /api/admin/studio/pages — list all studio pages
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("builder_pages")
    .select("id, slug, title, status, schema_version, created_at, updated_at")
    .eq("schema_version", 2)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST /api/admin/studio/pages — create a new studio page
export async function POST(request: Request) {
  const body = await request.json();
  const { title } = body as { title?: string };

  if (!title?.trim()) {
    return NextResponse.json(
      { error: "title is required" },
      { status: 400 }
    );
  }

  // Generate slug from title
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  // Create empty document
  const doc = createDocument(slug);
  doc.tokens = DEFAULT_TOKENS;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("builder_pages")
    .insert({
      slug,
      title: title.trim(),
      status: "draft",
      schema_version: 2,
      document: doc,
      layout_json: [],
    })
    .select("id, slug, title, status, schema_version")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "A page with this slug already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
