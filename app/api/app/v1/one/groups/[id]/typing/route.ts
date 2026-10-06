import { canPost } from "@destiny/shared";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { broadcastToGroup, requireGroupMembership } from "@/lib/destinyOne/chat.server";
import { limit, oneJson, oneRoute, requireUuid, type IdParams } from "@/lib/destinyOne/http";

// POST /api/app/v1/one/groups/[id]/typing
//
// "Leah is typing…": tells the rest of the group, once, that I'm writing a
// message. The app calls this at most every few seconds while the text box
// has something in it, and shows the indicator for a few seconds after each
// one, so nothing needs a "stopped" call. Nothing is stored: it goes out on
// Realtime's REST broadcast. Only for people who can post here.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  await limit("typing", caller.member.id, 30);

  const membership = await requireGroupMembership(caller, id);
  if (canPost({ member: caller.policy, groupKind: membership.kind, groupState: membership.state, myRole: membership.role })) {
    await broadcastToGroup(id, "typing", { groupId: id, memberId: caller.member.id, name: caller.member.display_name });
  }
  return oneJson({ ok: true as const });
});
