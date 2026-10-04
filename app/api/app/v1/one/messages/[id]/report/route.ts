import { after } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { sealReason } from "@/lib/destinyOne/crypto.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody, requireMessageId, type IdParams } from "@/lib/destinyOne/http";
import { emailSafeguardingAboutReport } from "@/lib/destinyOne/safeguardingEmail.server";
import { reportSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/messages/[id]/report  { reason }
//
// Sends the message to the safeguarding team's queue, rings the admin
// notification bell for safeguarding admins and emails each of them (no
// message content in the email). The person reported is not told.
// Deliberately doesn't require the consent gate: someone must always be able
// to report, whatever state their account is in.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request, { requireConsent: false });
  const id = requireMessageId((await params).id);
  await limit("report", caller.member.id, 10);
  const { reason } = await readBody(request, reportSchema);

  // The reason is sealed to the message's group (encrypted at rest), so look
  // that up first. Membership is still checked by d1_report_message.
  const supabase = createServiceClient();
  const { data: message, error: lookupError } = await supabase.from("d1_messages").select("group_id").eq("id", id).maybeSingle();
  if (lookupError) throw fromDbError(lookupError);
  if (!message) throw new OneError("not_found", "That message doesn't exist.");

  const { error } = await supabase.rpc("d1_report_message", {
    p_actor: caller.member.id,
    p_message: id,
    p_reason: sealReason(reason, message.group_id as string),
  });
  if (error) throw fromDbError(error);
  after(emailSafeguardingAboutReport);
  return oneJson({ ok: true as const }, 201);
});
