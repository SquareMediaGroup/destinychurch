import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";

// Own review history — dates and type only. `summary` is a manager's private
// notes/outcomes (see hr_reviews in REPOSITORY_DOCUMENTATION.md) and is never
// selected here, the same way it's redacted from the audit log when logged.
export async function GET() {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_reviews")
    .select("id, review_date, type, reviewer, next_review_date")
    .eq("staff_id", identity.staff.id)
    .order("review_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
