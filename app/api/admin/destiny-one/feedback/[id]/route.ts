import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { dbFailure, parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { FEEDBACK_COLUMNS, toAdminFeedback } from "@/lib/destinyOne/adminData.server";
import { feedbackStatusSchema } from "@/lib/destinyOne/schemas";
import { UUID_RE } from "@/lib/destinyOne/http";

// PATCH /api/admin/destiny-one/feedback/[id]  { status: "new" | "done" }
// Marks feedback as dealt with, or back to new.

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;

  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const body = await parseBody(request, feedbackStatusSchema);
  if ("response" in body) return body.response;

  const done = body.data.status === "done";
  const { data, error } = await createServiceClient()
    .from("d1_feedback")
    .update({ status: body.data.status, done_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select(FEEDBACK_COLUMNS)
    .maybeSingle();
  if (error) return dbFailure(error);
  if (!data) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const feedback = toAdminFeedback(data);
  await recordAudit({
    action: "update",
    section: "destiny_one",
    entity: "feedback",
    entityId: id,
    entityLabel: feedback.memberName,
    summary: done
      ? `Marked Destiny One feedback from ${feedback.memberName} as done`
      : `Reopened Destiny One feedback from ${feedback.memberName}`,
  });
  return NextResponse.json(feedback);
}
