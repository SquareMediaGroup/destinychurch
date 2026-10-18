import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { archiveSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/groups/[id]/archive  { archived: boolean }
//
// Hides this chat from the caller's own Chats list and silences its pushes
// (mentions still get through). Per person: nobody else sees a change, and the
// caller's mute setting is untouched, so restoring does not unmute.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  const { archived } = await readBody(request, archiveSchema);

  await createServiceClient()
    .from("d1_group_members")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("group_id", id)
    .eq("member_id", caller.member.id)
    .is("left_at", null);

  return oneJson({ ok: true as const });
});
