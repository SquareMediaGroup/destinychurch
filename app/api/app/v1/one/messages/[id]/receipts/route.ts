import type { D1ReadReceipts } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute, requireMessageId, type IdParams } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/messages/[id]/receipts
//
// "Seen by" for one message: who in the group (people who were there when it
// was sent) has read it and who hasn't yet. Only for the message's sender,
// or someone who manages the group, and only while their own read receipts
// are on. People with read receipts off are counted, not named. All of that
// is d1_read_receipts.

export const dynamic = "force-dynamic";

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  await limit("receipts", caller.member.id, 60);

  const { data, error } = await createServiceClient().rpc("d1_read_receipts", { p_actor: caller.member.id, p_message: id });
  if (error) throw fromDbError(error);

  const rows = (data ?? []) as { member_id: string; display_name: string; status: "read" | "unread" | "hidden" }[];
  const pick = (status: string) => rows.filter((r) => r.status === status).map((r) => ({ id: r.member_id, displayName: r.display_name }));
  const result: D1ReadReceipts = { read: pick("read"), notYet: pick("unread"), hidden: rows.filter((r) => r.status === "hidden").length };
  return oneJson(result);
});
