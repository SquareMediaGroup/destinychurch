import { after } from "next/server";
import { canPost } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { getMessage, listMessages, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { pushNewMessage } from "@/lib/destinyOne/push.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { sendMessageSchema } from "@/lib/destinyOne/schemas";

// GET  /api/app/v1/one/groups/[id]/messages?before=<id>&limit=<n>
//        Newest page first, returned oldest→newest. Only messages from after
//        you joined. Deleted messages come back without their content.
// POST /api/app/v1/one/groups/[id]/messages  { body?, replyTo?, attachmentId? }
//        Send. The database refuses frozen groups, non-members, and
//        non-admins in Announcements. Everyone else in the group receives it
//        on the d1-group:<id> Realtime topic; a content-free push goes out
//        afterwards.

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  const url = new URL(request.url);
  const before = Number(url.searchParams.get("before")) || undefined;
  const size = Math.min(Math.max(Number(url.searchParams.get("limit")) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  return oneJson(await listMessages(caller, id, { before, limit: size }));
});

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  limit("send", caller.member.id, 40);

  // Checked here first only for a friendlier error; the database re-checks.
  const membership = await requireGroupMembership(caller, id);
  if (!canPost({ member: caller.policy, groupKind: membership.kind, groupState: membership.state, myRole: membership.role })) {
    throw new OneError(
      "rule_violation",
      membership.state !== "active"
        ? "This group is paused and read-only for now."
        : "Only admins can post in Announcements.",
    );
  }

  const input = await readBody(request, sendMessageSchema);
  const { data, error } = await createServiceClient().rpc("d1_post_message", {
    p_actor: caller.member.id,
    p_group: id,
    p_body: input.body ?? null,
    p_reply_to: input.replyTo ?? null,
    p_attachment: input.attachmentId ?? null,
  });
  if (error) throw fromDbError(error);

  after(() => pushNewMessage(id, caller.member.id));
  return oneJson(await getMessage(caller, data as number), 201);
});
