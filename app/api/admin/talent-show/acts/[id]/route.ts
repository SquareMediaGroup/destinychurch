// Admin: edit, hide or delete one talent show act. Deleting an act also
// deletes the votes cast for it; hiding keeps them.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { cleanAct, UUID_RE } from "@/lib/talentShow.server";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const clean = cleanAct(body, { partial: true });
  if (!clean.ok) return NextResponse.json({ error: clean.error }, { status: 400 });

  const { data, error } = await createServiceClient()
    .from("talent_show_acts")
    .update({ ...clean.patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("name")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const only = Object.keys(clean.patch).length === 1;
  const summary =
    typeof clean.patch.hidden === "boolean" && only
      ? `${clean.patch.hidden ? "Hid" : "Showed"} the talent show act “${data.name}”`
      : typeof clean.patch.judge_xs === "number" && only
        ? `Set the judges' X's for “${data.name}” to ${clean.patch.judge_xs}`
        : `Edited the talent show act “${data.name}”`;
  await recordAudit({
    action: "update",
    section: "announcements",
    entity: "talent show act",
    entityId: id,
    entityLabel: data.name,
    summary,
    after: clean.patch,
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  const { data, error } = await createServiceClient()
    .from("talent_show_acts")
    .delete()
    .eq("id", id)
    .select("name")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });
  await recordAudit({
    action: "delete",
    section: "announcements",
    entity: "talent show act",
    entityId: id,
    entityLabel: data.name,
    summary: `Deleted the talent show act “${data.name}” and its votes`,
  });
  return NextResponse.json({ ok: true });
}
