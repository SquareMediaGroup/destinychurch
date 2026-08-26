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
    .from("training_categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

const EDITABLE = [
  "name",
  "description",
  "icon",
  "is_published",
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

  // Allow an explicit slug change, keeping it unique against other rows.
  if (typeof body.slug === "string" && body.slug.trim()) {
    const supabase = createServiceClient();
    const root = slugify(body.slug) || "category";
    let slug = root;
    let n = 2;
    for (let i = 0; i < 50; i++) {
      const { data } = await supabase
        .from("training_categories")
        .select("id")
        .eq("slug", slug)
        .neq("id", id)
        .maybeSingle();
      if (!data) break;
      slug = `${root}-${n++}`;
    }
    update.slug = slug;
  }

  const supabase = createServiceClient();
  const before = await readForAudit("training_categories", id);
  const { data, error } = await supabase
    .from("training_categories")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "update",
    section: "training",
    entity: "training category",
    entityId: id,
    entityLabel: data.name,
    summary: `Edited the training category “${data.name}”`,
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
  const before = await readForAudit("training_categories", id);
  // Sub-groups and posts cascade-delete via the FK constraints.
  const { error } = await supabase.from("training_categories").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Worth flagging that this took everything under it with it — the cascade is
  // invisible in the diff, and it is the part someone would want to know about.
  await recordAudit({
    action: "delete",
    section: "training",
    entity: "training category",
    entityId: id,
    entityLabel: (before?.name as string) ?? null,
    summary: `Deleted the training category “${before?.name ?? id}” and everything inside it`,
    before,
    metadata: { cascaded: "sub-groups, folders and posts" },
  });

  return NextResponse.json({ success: true });
}
