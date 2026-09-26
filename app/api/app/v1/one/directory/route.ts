import { canCreateGroup, isAdult, type D1DirectoryEntry } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { canManageCommunity } from "@/lib/destinyOne/chat.server";
import { OneError, UUID_RE, limit, oneJson, oneRoute } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/directory?q=<name>&communityId=<uuid>
//
// Name search for leaders putting groups together. Returns names and whether
// each person is a verified adult — which a leader needs to keep the 2-adult
// rule — and nothing else: no email, no phone, no photo. Ordinary members
// have no directory at all; there's no way to go looking for someone to
// message privately, because there is no private messaging.
//
// With communityId: only people already in that community (for adding to a
// sub-group). Without: every active member (for adding to a community), which
// needs senior leadership or a community admin role somewhere.

export const dynamic = "force-dynamic";

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export const GET = oneRoute(async (request) => {
  const caller = await requireMember(request);
  limit("directory", caller.member.id, 60);
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const communityId = url.searchParams.get("communityId");
  if (q.length < 2) return oneJson<D1DirectoryEntry[]>([]);

  const supabase = createServiceClient();
  let query = supabase
    .from("d1_members")
    .select("id, display_name, adult_on")
    .eq("status", "active")
    .ilike("display_name", `%${escapeLike(q)}%`)
    .order("display_name")
    .limit(25);

  if (communityId) {
    if (!UUID_RE.test(communityId)) throw new OneError("not_found", "That community doesn't exist.");
    const manages = await canManageCommunity(communityId, caller.member.id);
    const inIt = await supabase
      .from("d1_community_members")
      .select("member_id")
      .eq("community_id", communityId)
      .eq("member_id", caller.member.id)
      .maybeSingle();
    if (!manages && !(canCreateGroup(caller.policy) && inIt.data)) {
      throw new OneError("forbidden", "Only leaders can search the directory.");
    }
    const { data: ids } = await supabase
      .from("d1_community_members")
      .select("member_id")
      .eq("community_id", communityId);
    query = query.in("id", (ids ?? []).map((r) => r.member_id as string));
  } else {
    const senior = caller.policy.roles.includes("senior_leadership");
    const { data: adminOf } = await supabase
      .from("d1_community_members")
      .select("community_id")
      .eq("member_id", caller.member.id)
      .eq("role", "admin")
      .limit(1);
    if (!senior && !(adminOf ?? []).length) {
      throw new OneError("forbidden", "Only community admins can search everyone.");
    }
  }

  const { data, error } = await query;
  if (error) throw new OneError("unavailable", "Something went wrong. Please try again.");

  return oneJson<D1DirectoryEntry[]>(
    (data ?? []).map((m) => ({ id: m.id, displayName: m.display_name, isAdult: isAdult(m.adult_on) })),
  );
});
