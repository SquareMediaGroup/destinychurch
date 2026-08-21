import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";
import { dayCount } from "@/lib/hr";
import { sendLeaveRequestedEmail } from "@/lib/hrEmail";

export async function GET() {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .select("*")
    .eq("staff_id", identity.staff.id)
    .order("start_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// A staff member requesting their own leave. staff_id and status are always
// forced server-side — never taken from the body — so a request can't be
// filed against another staff member or pre-approved from the client.
export async function POST(request: Request) {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  if (!body.start_date || !body.end_date) {
    return NextResponse.json(
      { error: "start_date and end_date are required" },
      { status: 400 },
    );
  }

  const days = dayCount(body.start_date, body.end_date);
  if (days <= 0) {
    return NextResponse.json({ error: "End date must be on or after the start date." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_leave_requests")
    .insert({
      staff_id: identity.staff.id,
      type: body.type || "holiday",
      start_date: body.start_date,
      end_date: body.end_date,
      days,
      reason: body.reason?.trim() || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await sendLeaveRequestedEmail(data, identity.staff);
  } catch (err) {
    console.error("Leave-requested email failed:", err);
  }

  return NextResponse.json(data, { status: 201 });
}
