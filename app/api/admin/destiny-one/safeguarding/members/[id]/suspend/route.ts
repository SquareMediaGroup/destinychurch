import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { dbFailure, parseBody, requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";
import { adminSuspendSchema } from "@/lib/destinyOne/schemas";

// POST /api/admin/destiny-one/safeguarding/members/[id]/suspend  { suspended, reason }
//
// Lets the safeguarding team act on a report without needing the Destiny One
// Admin role: suspend the sender (they drop out of every group's counts at
// once, so any group left under the rules pauses and notifies, as usual) or
// reinstate them. Reinstating only works for someone staff have already
// verified — the database refuses to activate anyone else. Recorded in the
// audit log with the reason.

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;
  const memberId = (await params).id;

  const body = await parseBody(request, adminSuspendSchema);
  if ("response" in body) return body.response;
  const { suspended, reason } = body.data;

  const supabase = createServiceClient();
  const { data: member } = await supabase
    .from("d1_members")
    .select("id, display_name, status")
    .eq("id", memberId)
    .maybeSingle();
  if (!member || member.status === "deleted") return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Reinstating is for undoing a suspension, never a way round the approval queue.
  if (!suspended && member.status !== "suspended") {
    return NextResponse.json({ error: "Only a suspended account can be reinstated here." }, { status: 409 });
  }

  const { error } = await supabase
    .from("d1_members")
    .update({ status: suspended ? "suspended" : "active" })
    .eq("id", memberId);
  if (error) return dbFailure(error);

  await recordAudit({
    action: "moderate",
    section: "safeguarding",
    entity: "app member",
    entityId: memberId,
    entityLabel: member.display_name,
    summary: suspended
      ? `Suspended the Destiny One account "${member.display_name}"`
      : `Reinstated the Destiny One account "${member.display_name}"`,
    metadata: { reason, previousStatus: member.status },
  });
  return NextResponse.json({ ok: true });
}
