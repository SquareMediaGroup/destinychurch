import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { sendLeaveDecisionEmail } from "@/lib/hrEmail";
import type { LeaveRequest } from "@/lib/hr";

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
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .update(update)
    .eq("id", id)
    .select("*, hr_staff(first_name, last_name, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = data as unknown as LeaveWithStaff;

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
  const { error } = await supabase
    .from("hr_leave_requests")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
