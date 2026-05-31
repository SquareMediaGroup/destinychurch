import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

// Approve / reject (or otherwise edit) a leave request.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();

  const update: Record<string, unknown> = {};
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
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
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
