import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/studio/pages/:id
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("builder_pages")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PUT /api/admin/studio/pages/:id
export async function PUT(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { title, document: doc, status } = body as {
    title?: string;
    document?: unknown;
    status?: string;
  };

  const supabase = createServiceClient();
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (title !== undefined) updates.title = title;
  if (doc !== undefined) {
    updates.document = doc;
    updates.schema_version = 2;
  }
  if (status !== undefined) {
    updates.status = status;
    if (status === "published") {
      updates.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("builder_pages")
    .update(updates)
    .eq("id", id)
    .select("id, slug, title, status, schema_version, updated_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/admin/studio/pages/:id
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("builder_pages")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
