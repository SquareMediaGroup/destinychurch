import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";

// Own checklist items. Portal only surfaces "onboarding" — offboarding items
// are exit-process tasks for HR/managers to track, not something to hand a
// departing staff member a to-do list for.
export async function GET() {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_checklist_items")
    .select("*")
    .eq("staff_id", identity.staff.id)
    .eq("kind", "onboarding")
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
