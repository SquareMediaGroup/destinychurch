import { toPrefixQuery, type D1MessageHit } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/search/messages?q=<words>
//
// Full-text search over the caller's own messages view: groups they're in
// (not archived), messages since they joined, never deleted ones — the same
// set they could scroll to (d1_search_messages, migration
// 20260927_03_destiny_one_message_search.sql). Newest first, up to 30.

export const dynamic = "force-dynamic";

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
  const query = toPrefixQuery((new URL(request.url).searchParams.get("q") ?? "").slice(0, 100));
  if (!query) return oneJson([] as D1MessageHit[]);

  const { data, error } = await createServiceClient().rpc("d1_search_messages", {
    p_actor: caller.member.id,
    p_query: query,
    p_limit: 30,
  });
  if (error) throw fromDbError(error);

  const hits: D1MessageHit[] = ((data ?? []) as HitRow[]).map((r) => ({
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
