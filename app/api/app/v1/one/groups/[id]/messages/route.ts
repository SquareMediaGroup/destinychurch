import { after } from "next/server";
import { canPost, contentPreview, isLeaderRole, validatePollDeadline, type D1MessageContent } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { broadcastNewMessage, getMessage, listMessages, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { messageTerms, sealBody, sealContent } from "@/lib/destinyOne/crypto.server";
import { buildEventSnapshot } from "@/lib/destinyOne/events.server";
import { pushNewMessage } from "@/lib/destinyOne/push.server";
import { attachLinkPreview } from "@/lib/destinyOne/linkPreview.server";
import { attachVerseCard } from "@/lib/destinyOne/bible.server";
import { answer } from "@/lib/destinyOne/assistant.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { sendMessageSchema } from "@/lib/destinyOne/schemas";
import { buildPollContent } from "@/lib/destinyOne/pollContent";

// GET  /api/app/v1/one/groups/[id]/messages?before=<id>&limit=<n>
//        Newest page first, returned oldest→newest. Only messages from after
//        you joined. Deleted messages come back without their content.
// POST /api/app/v1/one/groups/[id]/messages  { body?, replyTo?, attachmentId?, poll?, event?, mentions? }
//        `prayer: { text }` posts a prayer request (on its own, no body or attachment).
//        A poll can carry `closesAt` (voting stops then; DestinyAI posts the result) and `pinResult`.
//        Send. The database refuses frozen groups, non-members, and
//        non-admins in Announcements. The text is stored sealed (encrypted at
//        rest). Everyone in the group receives it on the d1-group:<id>
//        Realtime topic, then a push goes out. In the chat with DestinyAI, or
//        with "@DestinyAI" in it, DestinyAI then answers (assistant.server.ts).

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
  await limit("send", caller.member.id, 40);

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
  // A poll's deadline is checked before anything is sent, so a bad one never leaves a poll with no end.
  if (input.poll?.closesAt) {
    const deadline = validatePollDeadline(new Date(input.poll.closesAt), new Date());
    if (!deadline.ok) throw new OneError("rule_violation", deadline.reason);
  }
  const content: D1MessageContent | null = input.poll
    ? buildPollContent(input.poll)
    : input.event
      ? await buildEventSnapshot(input.event)
      : input.prayer
        ? { kind: "prayer", prayer: { text: input.prayer.text, prayedCount: 0, iPrayed: false, answeredAt: null, answerUpdate: null } }
        : null;

  // Text is sealed here, before it reaches the database (crypto.server.ts),
  // with the search terms for it stored alongside in the same transaction.
  const body = input.body?.trim() || null;
  const { data, error } = await createServiceClient().rpc("d1_post_message", {
    p_actor: caller.member.id,
    p_group: id,
    p_body: sealBody(body, id),
    p_reply_to: input.replyTo ?? null,
    p_attachment: input.attachmentId ?? null,
    p_content: sealContent(content, id),
    p_terms: messageTerms(body, id),
    // Only ids that are current members are kept (d1_valid_mentions).
    p_mentions: body ? input.mentions ?? null : null,
  });
  if (error) throw fromDbError(error);

  if (input.poll?.closesAt) {
    // Stamps the deadline and queues the job that closes the poll (migration 20261110_03).
    const { error: deadlineError } = await createServiceClient().rpc("d1_start_poll_deadline", {
      p_message: data as number,
      p_closes_at: input.poll.closesAt,
      // Only admins and leaders can pin; a request from anyone else just doesn't pin.
      p_pin_result: input.poll.pinResult === true && (membership.role === "admin" || isLeaderRole(caller.policy.roles)),
    });
    if (deadlineError) throw fromDbError(deadlineError);
  }

  const message = await getMessage(caller, data as number);
  after(() =>
    Promise.all([
      broadcastNewMessage(message),
      pushNewMessage(
        id,
        caller.member.id,
        {
          senderName: caller.member.display_name,
          body: body ?? contentPreview(content),
          attachmentMime: message.attachment?.mimeType ?? null,
        },
        message.mentions,
        message.id,
      ),
      // A link's preview follows a moment later, so sending never waits on another website.
      attachLinkPreview(message.id, id, body),
      // The first Bible reference gets a verse card the same way (lib/destinyOne/bible.server.ts).
      attachVerseCard(message.id, id, body),
      answer(caller, membership.kind, membership.joinedAt, message),
    ]),
  );
  return oneJson(message, 201);
});
