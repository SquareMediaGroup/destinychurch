import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { listUnlinkedAdmins } from "@/lib/staffLogins";

// Admins (admin_roles rows) not yet linked to a staff record — for the "link
// an existing admin" option in the staff form. excludeStaffId keeps the
// admin currently linked to the record being edited in the list.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const excludeStaffId = searchParams.get("excludeStaffId") || undefined;

  const supabase = createServiceClient();
  const admins = await listUnlinkedAdmins(supabase, { excludeStaffId });

  return NextResponse.json(admins);
}
