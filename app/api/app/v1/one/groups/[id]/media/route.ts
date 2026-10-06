import { requireMember } from "@/lib/destinyOne/auth.server";
import { listMessages } from "@/lib/destinyOne/chat.server";
import { oneJson, oneRoute, requireUuid, type IdParams } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/groups/[id]/media?before=<id>&limit=<n>
//
// Group info → Photos and files: the messages in this group that carry a
// photo or file, newest page first (returned oldest→newest, like /messages).
// Same visibility as the chat itself: only since you joined, never deleted
// ones, never from someone you've blocked. Each comes with a fresh signed link.

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 60;
const MAX_LIMIT = 100;

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  const url = new URL(request.url);
  const before = Number(url.searchParams.get("before")) || undefined;
  const size = Math.min(Math.max(Number(url.searchParams.get("limit")) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return oneJson(await listMessages(caller, id, { before, limit: size, attachmentsOnly: true }));
});
