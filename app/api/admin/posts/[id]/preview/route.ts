import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { createPreviewToken, REVIEW_TTL_SECONDS } from "@/lib/postPreview.server";
import { recordAudit } from "@/lib/audit.server";

/**
 * A signed URL that shows this post even while it's a draft.
 *
 * `?kind=review` makes a 7-day link to send someone for sign-off; anything
 * else is the editor's own hour-long Preview.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const review = new URL(request.url).searchParams.get("kind") === "review";
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, review_link_version")
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { token, expiresAt } = createPreviewToken(data.id, {
    version: data.review_link_version ?? 0,
    ...(review ? { ttlSeconds: REVIEW_TTL_SECONDS } : {}),
  });

  if (review) {
    await recordAudit({
      action: "update",
      section: "posts",
      entity: "post",
      entityId: data.id,
      entityLabel: data.title,
      summary: `Made a 7-day review link for the post “${data.title}”`,
      changes: {},
    });
  }

  return NextResponse.json({
    url: `/${data.slug}?preview=${encodeURIComponent(token)}`,
    expiresAt: expiresAt.toISOString(),
  });
}

/** Revokes every outstanding preview and review link for this post. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data: current, error: readError } = await supabase
    .from("posts")
    .select("id, title, review_link_version")
    .eq("id", id)
    .maybeSingle();
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!current) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const { error } = await supabase
    .from("posts")
    .update({ review_link_version: (current.review_link_version ?? 0) + 1 })
    .eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "update",
    section: "posts",
    entity: "post",
    entityId: id,
    entityLabel: current.title,
    summary: `Turned off review links for the post “${current.title}”`,
    changes: {},
  });

  return NextResponse.json({ ok: true });
}
