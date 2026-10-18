import { after, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";
import { emailSafeguardingAboutEscalation } from "@/lib/destinyOne/safeguardingEmail.server";

// POST /api/admin/destiny-one/safeguarding/reports/[id]/escalate
//
// Escalates a report to the Designated Safeguarding Lead: marks it escalated,
// moves it to 'reviewing' if it was still open, and emails every Safeguarding
// Admin (content-free; see safeguardingEmail.server.ts). Escalating twice is
// a no-op that returns the original time, so a double click sends one email.

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = createServiceClient();
  const { data: report } = await supabase
    .from("d1_reports")
    .select("id, group_id, status, escalated_at")
    .eq("id", id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (report.escalated_at) return NextResponse.json({ ok: true, escalatedAt: report.escalated_at });
  if (report.status === "closed") {
    return NextResponse.json({ error: "This report is closed. Reopen it before escalating." }, { status: 409 });
  }

  const escalatedAt = new Date().toISOString();
  const { data: updated, error } = await supabase
    .from("d1_reports")
    .update({ escalated_at: escalatedAt, escalated_by: admin.userId, status: "reviewing" })
    .eq("id", id)
    .is("escalated_at", null)
    .select("escalated_at");
  if (error) return NextResponse.json({ error: "Couldn't escalate the report." }, { status: 500 });
  // Someone else escalated it a moment ago: theirs stands, and they sent the email.
  if (!updated?.length) return NextResponse.json({ ok: true, escalatedAt: report.escalated_at ?? escalatedAt });

  await recordAudit({
    action: "moderate",
    section: "safeguarding",
    entity: "message report",
    entityId: id,
    entityLabel: `Report #${id}`,
    summary: `Escalated Destiny One report #${id} to the Designated Safeguarding Lead`,
    after: { status: "reviewing", escalated_at: escalatedAt },
    metadata: { groupId: report.group_id },
  });
  after(() => emailSafeguardingAboutEscalation(id));
  return NextResponse.json({ ok: true, escalatedAt });
}
