import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readPortalUser } from "@/lib/staffPortalAuth";

// A directory of colleagues, not a management screen: name, role, department,
// work email, picture — never phone or anything else from hr_staff. "left"
// staff are excluded; on_leave still shown, since they're still a colleague.
export async function GET() {
  const identity = await readPortalUser();
  if (!identity) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_staff")
    .select("id, first_name, last_name, job_title, department, email, avatar_url, status")
    .neq("status", "left")
    .order("first_name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
