import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { checkSlug } from "@/lib/posts-slug";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { parsePageSettings } from "@/lib/posts-fields";
import { currentEditorName } from "@/lib/posts-admin.server";

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

  const settings = parsePageSettings(body);
  if (!settings.ok) {
    return NextResponse.json({ error: settings.error }, { status: 400 });
  }
  Object.assign(updates, settings.fields);

  if (body.slug !== undefined) {
    const result = await checkSlug(supabase, body.slug ?? "", id);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.status });
    }
    updates.slug = result.slug;
  }

  const before = await readForAudit("posts", id);
  if (!before) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  // Someone else saved since this editor loaded the post. Return their version
  // so the editor can say who and offer to overwrite, rather than letting the
  // last save silently win. The bulk list actions don't send this, on purpose:
  // publishing a page doesn't touch its content.
  if (
    typeof body.expected_updated_at === "string" &&
    before.updated_at &&
    new Date(before.updated_at as string).getTime() !== new Date(body.expected_updated_at).getTime()
  ) {
    return NextResponse.json(
      {
        error: "Someone else saved this page while you were editing it.",
        conflict: true,
        current: before,
      },
      { status: 409 },
    );
  }

  // Restoring from the Bin.
  if (body.restore === true) updates.deleted_at = null;
  updates.updated_by = await currentEditorName(supabase);

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
    body.restore === true
      ? "Restored from the Bin"
      : data.is_published && !wasPublished
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

/**
 * Moves the post to the Bin (it stops being served straight away). With
 * `?permanent=1`, deletes a post that is already in the Bin for good.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const permanent = new URL(request.url).searchParams.get("permanent") === "1";
  const supabase = createServiceClient();
  const before = await readForAudit("posts", id);
  if (!before) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  if (permanent) {
    if (!before.deleted_at) {
      return NextResponse.json(
        { error: "Move the post to the Bin before deleting it for good." },
        { status: 400 },
      );
    }
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordAudit({
      action: "delete",
      section: "posts",
      entity: "post",
      entityId: id,
      entityLabel: (before.title as string) ?? null,
      summary: `Deleted the post “${before.title ?? id}” for good`,
      before,
    });
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString(), updated_by: await currentEditorName(supabase) })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "posts",
    entity: "post",
    entityId: id,
    entityLabel: (before.title as string) ?? null,
    summary: `Moved the post “${before.title ?? id}” to the Bin`,
    before,
  });

  return NextResponse.json({ ok: true });
}
