import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { checkSlug } from "@/lib/posts-slug";
import { readForAudit, recordAudit } from "@/lib/audit.server";

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

  const before = await readForAudit("posts", id);

  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Publishing is the change people ask about, so it gets its own verb rather
  // than hiding as `is_published: false → true` in the diff.
  const wasPublished = Boolean(before?.is_published);
  const verb =
    data.is_published && !wasPublished
      ? "Published"
      : !data.is_published && wasPublished
        ? "Unpublished"
        : "Edited";

  await recordAudit({
    action: "update",
    section: "posts",
    entity: "post",
    entityId: id,
    entityLabel: data.title,
    summary: `${verb} the post “${data.title}” at /${data.slug}`,
    before,
    after: updates,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("posts", id);
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "posts",
    entity: "post",
    entityId: id,
    entityLabel: (before?.title as string) ?? null,
    summary: `Deleted the post “${before?.title ?? id}”`,
    before,
  });

  return NextResponse.json({ ok: true });
}
