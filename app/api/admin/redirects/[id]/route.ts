import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readForAudit, recordAudit } from "@/lib/audit.server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServiceClient();
  const before = await readForAudit("redirects", id);
  const { data, error } = await supabase
    .from("redirects")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "update",
    section: "site",
    entity: "redirect",
    entityId: id,
    entityLabel: `/${data.slug}`,
    summary: `Edited the redirect /${data.slug} → ${data.target_url}`,
    before,
    after: data,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("redirects", id);
  const { error } = await supabase.from("redirects").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "site",
    entity: "redirect",
    entityId: id,
    entityLabel: before?.slug ? `/${before.slug}` : null,
    summary: `Deleted the redirect /${before?.slug ?? id}`,
    before,
  });

  return NextResponse.json({ ok: true });
}
