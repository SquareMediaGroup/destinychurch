import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";

// Withdraw a leave request — only while it's still pending, and only your own.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const supabase = createServiceClient();

  // 404, not 403, on a mismatched owner or a non-pending request — a staff
  // member shouldn't be able to tell "not yours" from "doesn't exist" by ID.
  const { data: existing } = await supabase
    .from("hr_leave_requests")
    .select("id, staff_id, status")
    .eq("id", id)
    .maybeSingle();

  if (!existing || existing.staff_id !== identity.staff.id || existing.status !== "pending") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabase.from("hr_leave_requests").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
