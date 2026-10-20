import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { checkSlug } from "@/lib/posts-slug";
import { readForAudit, recordAudit } from "@/lib/audit.server";
import { parsePageSettings } from "@/lib/posts-fields";
import { currentEditorName, recordRevision } from "@/lib/posts-admin.server";
import { pickDraftFields, type PostFields } from "@/lib/posts";

const SAVE_MODES = ["draft", "publish", "discard_draft"] as const;
type SaveMode = (typeof SAVE_MODES)[number];

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

/**
 * Partial update. `mode` says what kind of save it is:
 *
 *   (none)          a direct write — the list's publish toggle, Bin restore.
 *   "draft"         the editor's Save draft. On a live page the content fields
 *                   go into `draft` and the public page doesn't change; on a
 *                   page that's never been published they're written directly
 *                   (it's all draft) and `is_published` is left alone.
 *   "publish"       the editor's Publish / Publish changes: writes everything,
 *                   publishes, clears the draft, and (for a live page whose URL
 *                   changed) redirects the old URL unless redirect_old_slug is
 *                   false.
 *   "discard_draft" throws the draft away.
 *
 * Settings that aren't content (tags, search visibility, schedule) always
 * apply straight away. Draft and publish saves also add a revision.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const mode: SaveMode | undefined = SAVE_MODES.includes(body.mode) ? body.mode : undefined;
  const supabase = createServiceClient();

  const fields: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = body.title?.trim();
    if (!title) {
      return NextResponse.json({ error: "A post title is required." }, { status: 400 });
    }
    fields.title = title;
  }
  if (body.body !== undefined) fields.body = body.body?.trim() || null;

  const settings = parsePageSettings(body);
  if (!settings.ok) {
    return NextResponse.json({ error: settings.error }, { status: 400 });
  }
  Object.assign(fields, settings.fields);

  let reclaimedRedirect: string | null = null;
  if (body.slug !== undefined) {
    const result = await checkSlug(supabase, body.slug ?? "", id);
    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: result.status });
    }
    fields.slug = result.slug;
    reclaimedRedirect = result.reclaimsRedirectId ?? null;
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

  const wasPublished = Boolean(before.is_published);
  const editor = await currentEditorName(supabase);
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: editor };

  if (mode === "discard_draft") {
    updates.draft = null;
  } else if (mode === "draft" && wasPublished) {
    // Content into the draft (merged over any earlier draft), settings direct.
    const content = pickDraftFields(fields as Partial<PostFields>);
    for (const [key, value] of Object.entries(fields)) {
      if (!(key in content)) updates[key] = value;
    }
    // Only what differs from the live page is kept, so saving without changes
    // (or changing something back) doesn't leave an empty "unpublished
    // changes" banner behind.
    const merged: Record<string, unknown> = {
      ...((before.draft as Record<string, unknown> | null) ?? {}),
      ...content,
    };
    for (const key of Object.keys(merged)) {
      if (JSON.stringify(merged[key] ?? null) === JSON.stringify(before[key] ?? null)) delete merged[key];
    }
    updates.draft = Object.keys(merged).length > 0 ? merged : null;
    // Only the slug the page is served at is checked against redirects; a
    // reclaim only happens when the draft is published.
    reclaimedRedirect = null;
  } else {
    Object.assign(updates, fields);
    if (mode === "publish") {
      updates.is_published = true;
      updates.draft = null;
    } else if (mode === "draft") {
      // A page that isn't published (perhaps unpublished with changes still
      // waiting): the editor loaded the draft over the columns, so what it
      // sends is the latest version and the old draft is spent.
      updates.draft = null;
    } else if (mode !== "draft" && body.is_published !== undefined) {
      updates.is_published = Boolean(body.is_published);
    }
  }
  // Restoring from the Bin.
  if (body.restore === true) updates.deleted_at = null;

  const { data, error } = await supabase
    .from("posts")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // A live page moved: keep the old URL working (flyers, QR codes, shared
  // links). Existing redirects to the old URL are pointed at the new one so
  // nothing chains, and a redirect this page is taking its slug back from is
  // removed (checkSlug only allows that for a redirect that points here).
  let redirected: string | null = null;
  const oldSlug = before.slug as string;
  if (mode === "publish" && wasPublished && data.slug !== oldSlug) {
    if (reclaimedRedirect) await supabase.from("redirects").delete().eq("id", reclaimedRedirect);
    await supabase.from("redirects").update({ target_url: `/${data.slug}` }).eq("target_url", `/${oldSlug}`);
    if (body.redirect_old_slug !== false) {
      const { error: redirectError } = await supabase.from("redirects").insert({
        slug: oldSlug,
        target_url: `/${data.slug}`,
        label: `Old link to “${data.title}”`,
      });
      if (redirectError) console.error("⚠️ Couldn't redirect old post URL:", redirectError.message);
      else redirected = oldSlug;
    }
  }

  if (mode === "draft" || mode === "publish") {
    await recordRevision(
      supabase,
      id,
      mode === "publish" ? "published" : "draft",
      { ...pickDraftFields(data as Partial<PostFields>), ...((data.draft as Partial<PostFields> | null) ?? {}) },
      editor,
    );
  }

  // Publishing is the change people ask about, so it gets its own verb rather
  // than hiding as `is_published: false → true` in the diff.
  const verb =
    body.restore === true
      ? "Restored from the Bin"
      : mode === "discard_draft"
        ? "Discarded the unpublished changes to"
        : mode === "draft" && wasPublished
          ? "Saved unpublished changes to"
          : mode === "publish" && wasPublished
            ? "Published changes to"
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
    summary: `${verb} the post “${data.title}” at /${data.slug}${
      redirected ? ` (the old URL /${redirected} now redirects here)` : ""
    }`,
    before,
    after: updates,
  });

  return NextResponse.json({ ...data, redirected_from: redirected });
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
