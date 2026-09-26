// Destiny One — reads for the website admin, shaped into lib/destinyOne/adminTypes.
// Server-only. Never selects message content: that's safeguarding's alone.

import "server-only";
import { isAdult } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import type {
  AdminCommunity,
  AdminGroup,
  AdminInvite,
  AdminMember,
  AdminPerson,
} from "@/lib/destinyOne/adminTypes";

interface MemberListRow {
  id: string;
  display_name: string;
  email: string | null;
  status: AdminMember["status"];
  roles: AdminMember["roles"];
  adult_on: string | null;
  declared_adult_on: string | null;
  request_note: string | null;
  request_submitted_at: string | null;
  verified_at: string | null;
  verification_source: AdminMember["verificationSource"];
  churchsuite_contact_id: number | null;
  churchsuite_child_id: number | null;
  created_at: string;
  community_count: number;
  group_count: number;
}

export function toAdminMember(r: MemberListRow): AdminMember {
  return {
    id: r.id,
    displayName: r.display_name,
    email: r.email,
    status: r.status,
    roles: r.roles ?? [],
    isAdult: isAdult(r.adult_on),
    adultOn: r.adult_on,
    declaredAdult: r.declared_adult_on ? isAdult(r.declared_adult_on) : null,
    requestNote: r.request_note,
    requestSubmittedAt: r.request_submitted_at,
    verifiedAt: r.verified_at,
    verificationSource: r.verification_source,
    churchsuiteLinked: Boolean(r.churchsuite_contact_id || r.churchsuite_child_id),
    createdAt: r.created_at,
    communityCount: r.community_count,
    groupCount: r.group_count,
  };
}

export async function listMembers(status?: string): Promise<AdminMember[]> {
  const { data, error } = await createServiceClient().rpc("d1_admin_members", { p_status: status ?? null });
  if (error) throw error;
  return ((data ?? []) as MemberListRow[]).map(toAdminMember);
}

export async function getMember(id: string): Promise<AdminMember | null> {
  const all = await listMembers();
  return all.find((m) => m.id === id) ?? null;
}

interface GroupRow {
  id: string;
  community_id: string;
  kind: AdminGroup["kind"];
  name: string;
  department: string | null;
  description: string | null;
  state: AdminGroup["state"];
  freeze_kind: AdminGroup["freezeKind"];
  frozen_reason: string | null;
  created_at: string;
  member_count: number;
  adult_count: number;
}

function toAdminGroup(r: GroupRow): AdminGroup {
  return {
    id: r.id,
    communityId: r.community_id,
    kind: r.kind,
    name: r.name,
    department: r.department,
    description: r.description,
    state: r.state,
    freezeKind: r.freeze_kind,
    frozenReason: r.frozen_reason,
    memberCount: r.member_count,
    adultCount: r.adult_count,
    createdAt: r.created_at,
  };
}

export async function listGroups(communityId?: string): Promise<AdminGroup[]> {
  const { data, error } = await createServiceClient().rpc("d1_admin_groups", { p_community: communityId ?? null });
  if (error) throw error;
  return ((data ?? []) as GroupRow[]).map(toAdminGroup);
}

export async function listCommunities(): Promise<AdminCommunity[]> {
  const supabase = createServiceClient();
  const [{ data: communities, error }, groups, { data: memberships }] = await Promise.all([
    supabase.from("d1_communities").select("id, name, description, archived_at, created_at").order("name"),
    listGroups(),
    supabase.from("d1_community_members").select("community_id"),
  ]);
  if (error) throw error;
  return (communities ?? []).map((c) => {
    const own = groups.filter((g) => g.communityId === c.id && g.kind === "group" && g.state !== "archived");
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      archived: Boolean(c.archived_at),
      memberCount: (memberships ?? []).filter((m) => m.community_id === c.id).length,
      groupCount: own.length,
      pausedGroupCount: groups.filter((g) => g.communityId === c.id && g.state === "frozen").length,
      createdAt: c.created_at,
    };
  });
}

type PersonJoin = { id: string; display_name: string; adult_on: string | null; status: string };

function toPerson(row: { role: string; joined_at: string; member: unknown }): AdminPerson | null {
  const m = row.member as PersonJoin | null;
  if (!m || m.status !== "active") return null;
  return {
    id: m.id,
    displayName: m.display_name,
    isAdult: isAdult(m.adult_on),
    role: row.role as AdminPerson["role"],
    joinedAt: row.joined_at,
  };
}

export async function communityPeople(communityId: string): Promise<AdminPerson[]> {
  const { data, error } = await createServiceClient()
    .from("d1_community_members")
    .select("role, joined_at, member:d1_members!d1_community_members_member_id_fkey(id, display_name, adult_on, status)")
    .eq("community_id", communityId);
  if (error) throw error;
  return (data ?? [])
    .map(toPerson)
    .filter((p): p is AdminPerson => p !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function groupPeople(groupId: string): Promise<AdminPerson[]> {
  const { data, error } = await createServiceClient()
    .from("d1_group_members")
    .select("role, joined_at, member:d1_members!d1_group_members_member_id_fkey(id, display_name, adult_on, status)")
    .eq("group_id", groupId)
    .is("left_at", null);
  if (error) throw error;
  return (data ?? [])
    .map(toPerson)
    .filter((p): p is AdminPerson => p !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

interface InviteRow {
  id: string;
  email: string;
  display_name: string;
  is_adult: boolean;
  roles: AdminInvite["roles"];
  community_ids: string[];
  status: AdminInvite["status"];
  expires_at: string;
  last_sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

export const INVITE_COLUMNS =
  "id, email, display_name, is_adult, roles, community_ids, status, expires_at, last_sent_at, accepted_at, created_at";

export function toAdminInvite(r: InviteRow): AdminInvite {
  const expired = r.status === "pending" && r.expires_at < new Date().toISOString();
  return {
    id: r.id,
    email: r.email,
    displayName: r.display_name,
    isAdult: r.is_adult,
    roles: r.roles ?? [],
    communityIds: r.community_ids ?? [],
    status: expired ? "expired" : r.status,
    expiresAt: r.expires_at,
    lastSentAt: r.last_sent_at,
    acceptedAt: r.accepted_at,
    createdAt: r.created_at,
  };
}

/** The communities and live group memberships of one member, for the member panel. */
export async function communityMemberships(memberId: string) {
  const supabase = createServiceClient();
  const [{ data: communities }, { data: groups }] = await Promise.all([
    supabase
      .from("d1_community_members")
      .select("role, community:d1_communities!inner(id, name)")
      .eq("member_id", memberId),
    supabase
      .from("d1_group_members")
      .select("role, group:d1_groups!inner(id, name, kind, state, community_id)")
      .eq("member_id", memberId)
      .is("left_at", null),
  ]);
  return {
    communities: (communities ?? []).map((c) => {
      const community = c.community as unknown as { id: string; name: string };
      return { id: community.id, name: community.name, role: c.role as "admin" | "member" };
    }),
    groups: (groups ?? [])
      .map((g) => {
        const group = g.group as unknown as { id: string; name: string; kind: string; state: string; community_id: string };
        return { id: group.id, name: group.name, kind: group.kind, state: group.state, communityId: group.community_id, role: g.role as "admin" | "member" };
      })
      .filter((g) => g.kind === "group"),
  };
}
