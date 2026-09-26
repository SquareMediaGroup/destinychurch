import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";
import { adminResolveSchema } from "@/lib/destinyOne/schemas";

// PATCH /api/admin/destiny-one/safeguarding/reports/[id]  { status: reviewing|closed, resolution? }

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = adminResolveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const closing = parsed.data.status === "closed";
  const { data, error } = await createServiceClient()
    .from("d1_reports")
    .update({
      status: parsed.data.status,
      resolution: parsed.data.resolution ?? null,
      resolved_by: closing ? admin.userId : null,
      resolved_at: closing ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id, group_id, status")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await recordAudit({
    action: "update",
    section: "safeguarding",
    entity: "message report",
    entityId: id,
    entityLabel: `Report #${id}`,
    summary: closing ? `Closed Destiny One report #${id}` : `Started reviewing Destiny One report #${id}`,
    // The resolution note can describe a safeguarding concern; record that
    // it changed, not what it says.
    after: { status: parsed.data.status, resolution: parsed.data.resolution ?? null },
    redactFields: ["resolution"],
    metadata: { groupId: data.group_id },
  });
  return NextResponse.json({ ok: true });
}
