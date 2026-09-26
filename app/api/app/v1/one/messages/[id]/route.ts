import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, oneJson, oneRoute, requireMessageId, type IdParams } from "@/lib/destinyOne/http";

// DELETE /api/app/v1/one/messages/[id]
//
// "Delete for everyone" — by the sender, or a group admin taking something
// down. Members stop seeing the content immediately; it is kept for
// safeguarding review until the retention purge. Works in a frozen group too:
// removing something should never be blocked.

export const dynamic = "force-dynamic";

export const DELETE = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request, { requireConsent: false });
  const id = requireMessageId((await params).id);

  const { error } = await createServiceClient().rpc("d1_delete_message", {
    p_actor: caller.member.id,
    p_message: id,
  });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
});
