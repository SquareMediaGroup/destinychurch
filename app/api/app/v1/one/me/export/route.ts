import type { D1Export } from "@destiny/shared";
import { isAdult } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { authenticate, loadConsents, loadMemberByAuthUser } from "@/lib/destinyOne/auth.server";
import { OneError, limit, oneJson, oneRoute } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/me/export
//
// GDPR right of access: everything Destiny One holds about the caller, as
// JSON — profile, consents, memberships, their own messages (including ones
// they deleted, since we still hold those) and reports they made. Other
// people's messages are not "their" data and are not included.

export const dynamic = "force-dynamic";

export const GET = oneRoute(async (request) => {
  const user = await authenticate(request);
  limit("export", user.id, 3);
  const member = await loadMemberByAuthUser(user.id);
  if (!member) throw new OneError("not_found", "We don't hold any Destiny One data for this account.");

  const supabase = createServiceClient();
  const [consents, communities, groups, messages, reports] = await Promise.all([
    loadConsents(member.id),
    supabase
      .from("d1_community_members")
      .select("role, joined_at, d1_communities!inner(id, name)")
      .eq("member_id", member.id),
    supabase
      .from("d1_group_members")
      .select("role, joined_at, left_at, d1_groups!inner(id, name)")
      .eq("member_id", member.id),
    supabase
      .from("d1_messages")
      .select("id, group_id, body, created_at, deleted_at")
      .eq("sender_id", member.id)
      .order("id", { ascending: true }),
    supabase
      .from("d1_reports")
      .select("id, reason, created_at, status")
      .eq("reporter_id", member.id),
  ]);

  const body: D1Export = {
    exportedAt: new Date().toISOString(),
    profile: {
      id: member.id,
      displayName: member.display_name,
      status: member.status,
      roles: member.roles ?? [],
      isAdult: isAdult(member.adult_on),
      createdAt: member.created_at,
    },
    consents,
    communities: (communities.data ?? []).map((c) => {
      const community = c.d1_communities as unknown as { id: string; name: string };
      return { id: community.id, name: community.name, role: c.role, joinedAt: c.joined_at };
    }),
    groups: (groups.data ?? []).map((g) => {
      const group = g.d1_groups as unknown as { id: string; name: string };
      return { id: group.id, name: group.name, role: g.role, joinedAt: g.joined_at, leftAt: g.left_at };
    }),
    messages: (messages.data ?? []).map((m) => ({
      id: m.id,
      groupId: m.group_id,
      body: m.body,
      createdAt: m.created_at,
      deletedAt: m.deleted_at,
    })),
    reports: (reports.data ?? []).map((r) => ({
      id: r.id,
      reason: r.reason,
      createdAt: r.created_at,
      status: r.status,
    })),
  };

  return oneJson(body);
});
