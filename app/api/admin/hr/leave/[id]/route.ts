import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { sendLeaveDecisionEmail } from "@/lib/hrEmail";
import { fullName, LEAVE_TYPE_LABELS, type LeaveRequest, type LeaveType } from "@/lib/hr";
import { readForAudit, recordAudit } from "@/lib/audit.server";

// The joined shape below is a single row (hr_leave_requests.staff_id → one
// hr_staff row), but supabase-js's select-string parser has no schema/FK
// metadata to infer that without generated DB types, so it defaults embedded
// relations to arrays. Cast explicitly rather than fight the parser.
type LeaveWithStaff = LeaveRequest & {
  hr_staff: { first_name: string; last_name: string; email: string | null } | null;
};

// Approve / reject (or otherwise edit) a leave request.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
  const isDecision = body.status === "approved" || body.status === "rejected";
  if (body.status) {
    update.status = body.status;
    update.reviewed_by = body.reviewed_by ?? "admin";
    update.reviewed_at = new Date().toISOString();
  }
  for (const key of ["type", "start_date", "end_date", "days", "reason"]) {
    if (key in body) update[key] = body[key];
  }

  const supabase = createServiceClient();
  const before = await readForAudit("hr_leave_requests", id);
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .update(update)
    .eq("id", id)
    .select("*, hr_staff(first_name, last_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = data as unknown as LeaveWithStaff;

  const who = row.hr_staff ? fullName(row.hr_staff) : "a staff member";
  await recordAudit({
    action: body.status === "approved" ? "approve" : body.status === "rejected" ? "reject" : "update",
    section: "hr",
    entity: "leave request",
    entityId: id,
    entityLabel: who,
    summary: isDecision
      ? `${body.status === "approved" ? "Approved" : "Declined"} ${LEAVE_TYPE_LABELS[row.type as LeaveType] ?? row.type} leave for ${who}, ${row.start_date} to ${row.end_date}`
      : `Edited the leave request for ${who}, ${row.start_date} to ${row.end_date}`,
    before,
    after: update,
    redactFields: ["reason"],
  });

  // Best-effort: the approval/rejection itself already succeeded above, so a
  // Resend hiccup here must never surface as a failed decision.
  if (isDecision && row.hr_staff) {
    try {
      await sendLeaveDecisionEmail(row, row.hr_staff);
    } catch (err) {
      console.error("Leave-decision email failed:", err);
    }
  }

  return NextResponse.json(row);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const before = await readForAudit("hr_leave_requests", id);
  const staff = before?.staff_id
    ? await readForAudit("hr_staff", before.staff_id as string, "first_name, last_name")
    : null;
  const { error } = await supabase
    .from("hr_leave_requests")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const who = staff
    ? fullName(staff as { first_name: string; last_name: string })
    : "a staff member";
  await recordAudit({
    action: "delete",
    section: "hr",
    entity: "leave request",
    entityId: id,
    entityLabel: who,
    summary: `Deleted the leave request for ${who}${before ? `, ${before.start_date} to ${before.end_date}` : ""}`,
    before,
    redactFields: ["reason"],
  });

  return NextResponse.json({ success: true });
}
