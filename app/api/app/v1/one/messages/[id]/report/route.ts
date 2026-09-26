import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute, readBody, requireMessageId, type IdParams } from "@/lib/destinyOne/http";
import { reportSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/messages/[id]/report  { reason }
//
// Sends the message to the safeguarding team's queue and rings the admin
// notification bell for safeguarding admins. The person reported is not told.
// Deliberately doesn't require the consent gate: someone must always be able
// to report, whatever state their account is in.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request, { requireConsent: false });
  const id = requireMessageId((await params).id);
  limit("report", caller.member.id, 10);
  const { reason } = await readBody(request, reportSchema);

  const { error } = await createServiceClient().rpc("d1_report_message", {
    p_actor: caller.member.id,
    p_message: id,
    p_reason: reason,
  });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const }, 201);
});
