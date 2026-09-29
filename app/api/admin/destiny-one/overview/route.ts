import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { listGroups, listMembers } from "@/lib/destinyOne/adminData.server";
import { requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import type { AdminOverview } from "@/lib/destinyOne/adminTypes";

// GET /api/admin/destiny-one/overview — the numbers on /admin/destiny-one.

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;

  const supabase = createServiceClient();
  const [members, groups, { count: communities }, { count: openInvites }] = await Promise.all([
    listMembers(),
    listGroups(),
    supabase.from("d1_communities").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase
      .from("d1_invites")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString()),
  ]);

  const overview: AdminOverview = {
    activeMembers: members.filter((m) => m.status === "active").length,
    pendingRequests: members.filter((m) => m.status === "pending" && m.requestSubmittedAt).length,
    unsubmittedSignIns: members.filter((m) => m.status === "pending" && !m.requestSubmittedAt).length,
    suspended: members.filter((m) => m.status === "suspended").length,
    openInvites: openInvites ?? 0,
    communities: communities ?? 0,
    groups: groups.filter((g) => g.kind === "group" && g.state !== "archived").length,
    pausedGroups: groups.filter((g) => g.state === "frozen").length,
  };
  return NextResponse.json(overview);
}
