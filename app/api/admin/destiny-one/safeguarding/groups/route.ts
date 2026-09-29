import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { listGroups } from "@/lib/destinyOne/adminData.server";
import { requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";

// GET /api/admin/destiny-one/safeguarding/groups
//
// Every group (including archived ones, whose history is still held) with its
// community name and live counts, so a safeguarding admin can pick which
// conversation to review or freeze. Names and counts only — opening content
// is the transcript route, with a reason, audited.

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;

  const [groups, { data: communities }] = await Promise.all([
    listGroups(),
    createServiceClient().from("d1_communities").select("id, name"),
  ]);
  const names = new Map((communities ?? []).map((c) => [c.id, c.name as string]));
  return NextResponse.json(groups.map((g) => ({ ...g, communityName: names.get(g.communityId) ?? "" })));
}
