import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { FEEDBACK_COLUMNS, toAdminFeedback } from "@/lib/destinyOne/adminData.server";

// GET /api/admin/destiny-one/feedback — "Report a problem" and "Send feedback"
// from the app, newest first.

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;

  const { data, error } = await createServiceClient()
    .from("d1_feedback")
    .select(FEEDBACK_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toAdminFeedback));
}
