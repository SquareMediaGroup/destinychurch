import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { slugify } from "@/lib/jobs";
import { readForAudit, recordAudit } from "@/lib/audit.server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("training_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

const EDITABLE = [
  "title",
  "folder_id",
  "summary",
  "body",
  "subgroup_id",
  "is_published",
  "min_read_seconds",
  "sort_order",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) update[key] = body[key];
  }

  // Allow an explicit slug change, unique within the (possibly new) sub-group.
  if (typeof body.slug === "string" && body.slug.trim()) {
    const supabase = createServiceClient();
    const { data: current } = await supabase
      .from("training_posts")
      .select("subgroup_id")
      .eq("id", id)
      .single();
    const subgroupId = (update.subgroup_id as string) || current?.subgroup_id;
    const root = slugify(body.slug) || "post";
    let slug = root;
    let n = 2;
    for (let i = 0; i < 50; i++) {
      const { data } = await supabase
        .from("training_posts")
        .select("id")
        .eq("subgroup_id", subgroupId)
        .eq("slug", slug)
        .neq("id", id)
        .maybeSingle();
      if (!data) break;
      slug = `${root}-${n++}`;
    }
    update.slug = slug;
  }

  const supabase = createServiceClient();
  const before = await readForAudit("training_posts", id);
  const { data, error } = await supabase
    .from("training_posts")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const wasPublished = Boolean(before?.is_published);
  const verb =
    data.is_published && !wasPublished
      ? "Published"
      : !data.is_published && wasPublished
        ? "Unpublished"
        : "Edited";

  await recordAudit({
    action: "update",
    section: "training",
    entity: "training post",
    entityId: id,
    entityLabel: data.title,
    summary: `${verb} the training post “${data.title}”`,
    before,
    after: update,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("training_posts", id);
  const { error } = await supabase.from("training_posts").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "training",
    entity: "training post",
    entityId: id,
    entityLabel: (before?.title as string) ?? null,
    summary: `Deleted the training post “${before?.title ?? id}”`,
    before,
  });

  return NextResponse.json({ success: true });
}
