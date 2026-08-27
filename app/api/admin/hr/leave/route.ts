import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { formatDate, fullName, LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/hr";
import { readForAudit, recordAudit } from "@/lib/audit.server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const staffId = searchParams.get("staff_id");

  const supabase = createServiceClient();
  let query = supabase
    .from("hr_leave_requests")
    .select("*, hr_staff(first_name, last_name)")
    .order("start_date", { ascending: false });

  if (staffId) query = query.eq("staff_id", staffId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.staff_id || !body.start_date || !body.end_date) {
    return NextResponse.json(
      { error: "staff_id, start_date and end_date are required" },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .insert({
      staff_id: body.staff_id,
      type: body.type || "holiday",
      start_date: body.start_date,
      end_date: body.end_date,
      days: body.days ?? 0,
      reason: body.reason?.trim() || null,
      status: body.status || "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const staff = await readForAudit("hr_staff", body.staff_id, "first_name, last_name");
  const who = staff
    ? fullName(staff as { first_name: string; last_name: string })
    : "a staff member";

  await recordAudit({
    action: "create",
    section: "hr",
    entity: "leave request",
    entityId: data.id,
    entityLabel: who,
    summary: `Logged ${(LEAVE_TYPE_LABELS[data.type as LeaveType] ?? data.type).toLowerCase()} leave for ${who}, ${formatDate(data.start_date)} to ${formatDate(data.end_date)} (${data.days} day${data.days === 1 ? "" : "s"})`,
    after: data,
    redactFields: ["reason"],
  });

  return NextResponse.json(data, { status: 201 });
}
