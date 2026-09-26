import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { dbFailure, requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";
import { adminFreezeSchema } from "@/lib/destinyOne/schemas";

// POST /api/admin/destiny-one/groups/[id]/freeze  { frozen, reason }
//
// Freeze a group by hand while something is looked into, or lift a manual
// freeze. A manual freeze is never lifted by the automatic 2-adult rule;
// lifting one hands the group back to that rule, which may re-freeze it at
// once if the membership still doesn't satisfy it.

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;
  const groupId = (await params).id;

  const parsed = adminFreezeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  if (parsed.data.frozen && parsed.data.reason.length < 3) {
    return NextResponse.json({ error: "Give a short reason members will see." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: group } = await supabase.from("d1_groups").select("name").eq("id", groupId).maybeSingle();
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data, error } = await supabase.rpc("d1_set_manual_freeze", {
    p_group: groupId,
    p_frozen: parsed.data.frozen,
    p_reason: parsed.data.reason,
    p_admin: admin.userId,
  });
  if (error) return dbFailure(error);

  await recordAudit({
    action: "moderate",
    section: "safeguarding",
    entity: "chat group",
    entityId: groupId,
    entityLabel: group.name,
    summary: parsed.data.frozen
      ? `Froze the Destiny One group "${group.name}"`
      : `Lifted the manual freeze on the Destiny One group "${group.name}"`,
    metadata: { reason: parsed.data.reason, resultingState: data },
  });
  return NextResponse.json({ ok: true, state: data });
}
