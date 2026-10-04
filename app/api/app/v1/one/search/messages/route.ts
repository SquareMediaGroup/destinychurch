import { MIN_SEARCH_CHARS, type D1MessageHit } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { messageKeyring, openBody } from "@/lib/destinyOne/crypto.server";
import { queryTerms, searchWords } from "@/lib/destinyOne/sealing";
import { fromDbError, limit, oneJson, oneRoute, requireUuid } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/search/messages?q=<words>[&groupId=<uuid>]
//
// Search over the caller's own messages view: groups they're in (not
// archived), messages since they joined, never deleted ones, nothing from
// people they've blocked — the same set they could scroll to. Newest first,
// up to 30. With groupId, only that group (search from inside a chat).
//
// Message text is encrypted at rest, so this searches a blind index instead
// of the text: each word of the query becomes a keyed hash per group
// (sealing.ts), and d1_search_messages (migration 20261004_01) returns the
// messages that have every one. Each word matches as a prefix ("pra" finds
// "prayer").

export const dynamic = "force-dynamic";

const MAX_HITS = 30;
const MAX_WORDS = 8;

interface HitRow {
  id: number;
  group_id: string;
  group_name: string;
  community_name: string;
  sender_id: string | null;
  sender_name: string | null;
  body: string | null;
  created_at: string;
}

export const GET = oneRoute(async (request) => {
  const caller = await requireMember(request);
  await limit("search", caller.member.id, 60);
  const params = new URL(request.url).searchParams;
  const words = searchWords((params.get("q") ?? "").slice(0, 100)).slice(0, MAX_WORDS);
  if (!words.length || words.join("").length < MIN_SEARCH_CHARS) return oneJson([] as D1MessageHit[]);

  const groupParam = params.get("groupId");
  let groupIds: string[];
  if (groupParam) {
    const groupId = requireUuid(groupParam, "group");
    await requireGroupMembership(caller, groupId);
    groupIds = [groupId];
  } else {
    const { data, error } = await createServiceClient()
      .from("d1_group_members")
      .select("group_id")
      .eq("member_id", caller.member.id)
      .is("left_at", null);
    if (error) throw fromDbError(error);
    groupIds = (data ?? []).map((r) => r.group_id as string);
  }
  if (!groupIds.length) return oneJson([] as D1MessageHit[]);

  const ring = messageKeyring();
  const terms = Object.fromEntries(groupIds.map((g) => [g, queryTerms(ring, words, g)]));
  const { data, error } = await createServiceClient().rpc("d1_search_messages", {
    p_actor: caller.member.id,
    p_terms: terms,
    p_limit: MAX_HITS,
  });
  if (error) throw fromDbError(error);

  const hits: D1MessageHit[] = ((data ?? []) as HitRow[]).map((r) => ({
    id: r.id,
    groupId: r.group_id,
    groupName: r.group_name,
    communityName: r.community_name,
    sender: r.sender_id ? { id: r.sender_id, displayName: r.sender_name ?? "Former member" } : null,
    body: openBody(r.body, r.group_id) ?? "",
    createdAt: r.created_at,
    mine: r.sender_id === caller.member.id,
  }));
  return oneJson(hits);
});
