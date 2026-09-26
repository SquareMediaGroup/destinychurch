import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";

// GET /api/admin/destiny-one/safeguarding/events?open=1
//
// The safeguarding queue: groups that froze (fell below 2 adults or 3
// members), unfroze, were frozen by hand, and reports. Newest first.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;

  const open = new URL(request.url).searchParams.get("open") === "1";
  let query = createServiceClient()
    .from("d1_safeguarding_events")
    .select("id, kind, detail, adult_count, member_count, report_id, resolved_at, created_at, group:d1_groups(id, name, state, frozen_reason, community:d1_communities(id, name))")
    .order("created_at", { ascending: false })
    .limit(200);
  if (open) query = query.is("resolved_at", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data ?? [] });
}
