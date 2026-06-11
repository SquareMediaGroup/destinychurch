import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireUser } from "@/lib/apiAuth";

// GET /api/admin/builder/pages/[id]
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("builder_pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ page: data });
}

// PUT /api/admin/builder/pages/[id]
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();
  const { slug, title, layout_json, status } = body;

  const supabase = createServiceClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (slug !== undefined) update.slug = slug;
  if (title !== undefined) update.title = title;
  if (layout_json !== undefined) update.layout_json = layout_json;
  if (status !== undefined) {
    update.status = status;
    if (status === "published") {
      update.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from("builder_pages")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ page: data });
}

// DELETE /api/admin/builder/pages/[id]
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireUser();
  if (denied) return denied;

  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("builder_pages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
