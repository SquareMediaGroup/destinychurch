import { toPrefixQuery, type D1MessageHit } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember, type Caller } from "@/lib/destinyOne/auth.server";
import { blockedIds, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { fromDbError, limit, oneJson, oneRoute, requireUuid } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/search/messages?q=<words>[&groupId=<uuid>]
//
// Full-text search over the caller's own messages view: groups they're in
// (not archived), messages since they joined, never deleted ones — the same
// set they could scroll to (d1_search_messages, migration
// 20260927_03_destiny_one_message_search.sql). Newest first, up to 30.
//
// With groupId, only that group (search from inside a chat). Same rules,
// applied here: the caller must be in the group, and sees nothing from before
// they joined, nothing deleted and nothing from people they've blocked.

export const dynamic = "force-dynamic";

const MAX_HITS = 30;

interface HitRow {
  id: number;
  group_id: string;
  group_name: string;
  community_name: string;
  sender_id: string | null;
  sender_name: string | null;
  body: string;
  created_at: string;
}

export const GET = oneRoute(async (request) => {
  const caller = await requireMember(request);
  await limit("search", caller.member.id, 60);
  const params = new URL(request.url).searchParams;
  const query = toPrefixQuery((params.get("q") ?? "").slice(0, 100));
  const groupParam = params.get("groupId");
  if (!query) return oneJson([] as D1MessageHit[]);

  const rows = groupParam ? await searchGroup(caller, requireUuid(groupParam, "group"), query) : await searchAll(caller.member.id, query);

  const hits: D1MessageHit[] = rows.map((r) => ({
    id: r.id,
    groupId: r.group_id,
    groupName: r.group_name,
    communityName: r.community_name,
    sender: r.sender_id ? { id: r.sender_id, displayName: r.sender_name ?? "Former member" } : null,
    body: r.body,
    createdAt: r.created_at,
    mine: r.sender_id === caller.member.id,
  }));
  return oneJson(hits);
});

async function searchAll(memberId: string, query: string): Promise<HitRow[]> {
  const { data, error } = await createServiceClient().rpc("d1_search_messages", {
    p_actor: memberId,
    p_query: query,
    p_limit: MAX_HITS,
  });
  if (error) throw fromDbError(error);
  return (data ?? []) as HitRow[];
}

async function searchGroup(caller: Caller, groupId: string, query: string): Promise<HitRow[]> {
  const [membership, blocked] = await Promise.all([requireGroupMembership(caller, groupId), blockedIds(caller.member.id)]);
  // Archived groups are out of the chat list, so they're out of search too.
  if (membership.state === "archived") return [];

  const supabase = createServiceClient();
  let search = supabase
    .from("d1_messages")
    .select("id, group_id, sender_id, body, created_at, sender:d1_members!d1_messages_sender_id_fkey(display_name)")
    .eq("group_id", groupId)
    .gte("created_at", membership.joinedAt)
    .is("deleted_at", null)
    .textSearch("search", query, { config: "english" })
    .order("created_at", { ascending: false })
    .limit(MAX_HITS);
  // (`or` keeps "Former member" messages, whose sender_id is null: NOT IN alone drops them.)
  if (blocked.length) search = search.or(`sender_id.is.null,sender_id.not.in.(${blocked.join(",")})`);

  const [{ data, error }, { data: group }] = await Promise.all([
    search,
    supabase.from("d1_groups").select("name, community:d1_communities(name)").eq("id", groupId).maybeSingle(),
  ]);
  if (error) throw fromDbError(error);

  const groupName = (group?.name as string | undefined) ?? "";
  const communityName = (group?.community as unknown as { name: string } | null)?.name ?? "";
  return (data ?? []).map((m) => ({
    id: m.id as number,
    group_id: m.group_id as string,
    group_name: groupName,
    community_name: communityName,
    sender_id: (m.sender_id as string | null) ?? null,
    sender_name: (m.sender as unknown as { display_name: string } | null)?.display_name ?? null,
    body: (m.body as string | null) ?? "",
    created_at: m.created_at as string,
  }));
}
