import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { slugify } from "@/lib/jobs";
import { hashPassword } from "@/lib/trainingAccess";
import { readForAudit, recordAudit } from "@/lib/audit.server";

type Row = Record<string, unknown> & { password_hash?: string | null };
function toPublic(row: Row) {
  const { password_hash, ...rest } = row;
  return { ...rest, has_password: !!password_hash };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("training_subgroups")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(toPublic(data as Row));
}

const EDITABLE = [
  "name",
  "description",
  "category_id",
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

  // Password handling: a non-empty `password` sets a new hash; `clear_password`
  // removes it; a blank/absent password leaves the existing one untouched.
  if (body.clear_password === true) {
    update.password_hash = null;
  } else if (typeof body.password === "string" && body.password.length > 0) {
    update.password_hash = hashPassword(body.password);
  }

  // Allow an explicit slug change, unique within the (possibly new) category.
  if (typeof body.slug === "string" && body.slug.trim()) {
    const supabase = createServiceClient();
    const { data: current } = await supabase
      .from("training_subgroups")
      .select("category_id")
      .eq("id", id)
      .single();
    const categoryId = (update.category_id as string) || current?.category_id;
    const root = slugify(body.slug) || "group";
    let slug = root;
    let n = 2;
    for (let i = 0; i < 50; i++) {
      const { data } = await supabase
        .from("training_subgroups")
        .select("id")
        .eq("category_id", categoryId)
        .eq("slug", slug)
        .neq("id", id)
        .maybeSingle();
      if (!data) break;
      slug = `${root}-${n++}`;
    }
    update.slug = slug;
  }

  const supabase = createServiceClient();
  const before = await readForAudit("training_subgroups", id);
  const { data, error } = await supabase
    .from("training_subgroups")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The password itself never reaches the log, but *that it changed* is exactly
  // the kind of thing a Super Admin is looking for.
  const passwordNote =
    body.clear_password === true
      ? " and removed its password"
      : typeof body.password === "string" && body.password.length > 0
        ? " and set a new password"
        : "";

  await recordAudit({
    action: "update",
    section: "training",
    entity: "training sub-group",
    entityId: id,
    entityLabel: data.name,
    summary: `Edited the training sub-group “${data.name}”${passwordNote}`,
    before,
    after: update,
  });

  return NextResponse.json(toPublic(data as Row));
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("training_subgroups", id);
  // Posts cascade-delete via the FK constraint.
  const { error } = await supabase.from("training_subgroups").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "training",
    entity: "training sub-group",
    entityId: id,
    entityLabel: (before?.name as string) ?? null,
    summary: `Deleted the training sub-group “${before?.name ?? id}” and its posts`,
    before,
    metadata: { cascaded: "folders and posts" },
  });

  return NextResponse.json({ success: true });
}
