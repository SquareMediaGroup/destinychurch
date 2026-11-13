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

  const supabase = createServiceClient();
  const [groups, { data: communities }, { data: flags }] = await Promise.all([
    listGroups(),
    supabase.from("d1_communities").select("id, name"),
    // Read on its own so the list still loads before migration 20261112_02 is applied.
    supabase.from("d1_groups").select("id, discoverable, u18_suitable"),
  ]);
  const names = new Map((communities ?? []).map((c) => [c.id, c.name as string]));
  const discover = new Map((flags ?? []).map((f) => [f.id as string, { discoverable: f.discoverable === true, u18Suitable: f.u18_suitable === true }]));
  return NextResponse.json(
    groups.map((g) => ({ ...g, communityName: names.get(g.communityId) ?? "", discoverable: discover.get(g.id)?.discoverable ?? false, u18Suitable: discover.get(g.id)?.u18Suitable ?? false })),
  );
}
