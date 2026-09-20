import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";

// Tick or untick one of your own onboarding items. Only `is_done` is
// writable from here — staff can check off "read the safeguarding policy",
// not edit the label or add items to their own checklist.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  if (typeof body?.is_done !== "boolean") {
    return NextResponse.json({ error: "is_done must be a boolean" }, { status: 400 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  // 404, not 403, on a mismatched owner — mirrors DELETE /api/portal/leave/[id].
  const { data: existing } = await supabase
    .from("hr_checklist_items")
    .select("id, staff_id, kind")
    .eq("id", id)
    .maybeSingle();

  if (!existing || existing.staff_id !== identity.staff.id || existing.kind !== "onboarding") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("hr_checklist_items")
    .update({ is_done: body.is_done, done_at: body.is_done ? new Date().toISOString() : null })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
