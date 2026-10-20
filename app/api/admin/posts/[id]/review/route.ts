import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { recordNotification } from "@/lib/notify.server";
import { currentEditorName } from "@/lib/posts-admin.server";

/**
 * "Ready for review": marks the post and puts a notification on the bell for
 * Posts admins (site_admin, and super_admin as always). Publishing clears it
 * (see the PATCH route), as does DELETE here ("Withdraw").
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const note = (await request.json().catch(() => ({})))?.note;
  const supabase = createServiceClient();
  const by = (await currentEditorName(supabase)) ?? "Someone";
  const { data, error } = await supabase
    .from("posts")
    .update({ review_requested_at: new Date().toISOString(), review_requested_by: by })
    .eq("id", id)
    .select("id, title, slug, review_requested_at, review_requested_by")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const trimmed = typeof note === "string" ? note.trim().slice(0, 300) : "";
  await recordNotification({
    section: "posts",
    kind: "review",
    entityId: data.id,
    entityLabel: data.title,
    summary: `${by} asked for a review of “${data.title}”${trimmed ? `: ${trimmed}` : ""}`,
    href: `/admin/posts?open=${data.id}`,
    roles: ["site_admin"],
  });
  await recordAudit({
    action: "update",
    section: "posts",
    entity: "post",
    entityId: data.id,
    entityLabel: data.title,
    summary: `Asked for a review of the post “${data.title}”`,
    changes: { review_requested_at: { from: null, to: data.review_requested_at } },
    metadata: trimmed ? { note: trimmed } : null,
  });
  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { data, error } = await createServiceClient()
    .from("posts")
    .update({ review_requested_at: null, review_requested_by: null })
    .eq("id", id)
    .select("id, title")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  await recordAudit({
    action: "update",
    section: "posts",
    entity: "post",
    entityId: data.id,
    entityLabel: data.title,
    summary: `Withdrew the review request for the post “${data.title}”`,
    changes: {},
  });
  return NextResponse.json({ ok: true });
}
