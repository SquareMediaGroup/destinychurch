import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";

// PATCH /api/admin/destiny-one/events/[id] — mark a safeguarding event handled.

export const dynamic = "force-dynamic";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await createServiceClient()
    .from("d1_safeguarding_events")
    .update({ resolved_at: new Date().toISOString(), resolved_by: admin.userId })
    .eq("id", id)
    .is("resolved_at", null)
    .select("id, kind, detail, group_id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found or already resolved" }, { status: 404 });

  await recordAudit({
    action: "update",
    section: "safeguarding",
    entity: "safeguarding event",
    entityId: id,
    entityLabel: data.kind,
    summary: `Marked a Destiny One safeguarding event (${data.kind}) as handled`,
    metadata: { groupId: data.group_id, detail: data.detail },
  });
  return NextResponse.json({ ok: true });
}
