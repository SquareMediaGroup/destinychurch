import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { checkSlug } from "@/lib/posts-slug";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServiceClient();

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) {
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "A post title is required." }, { status: 400 });
    }
    updates.title = title;
  }
  if (body.body !== undefined) updates.body = body.body?.trim() || null;
  if (body.is_published !== undefined) updates.is_published = body.is_published;

  if (body.slug !== undefined) {
    const result = await checkSlug(supabase, body.slug ?? "", id);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.status });
    }
    updates.slug = result.slug;
  }

  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
