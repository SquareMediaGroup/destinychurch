import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute, requireMessageId, type IdParams } from "@/lib/destinyOne/http";

// POST   /api/app/v1/one/messages/[id]/pin  — pin it (group managers; at most 3, a fourth unpins the oldest)
// DELETE /api/app/v1/one/messages/[id]/pin  — unpin it
//
// d1_pin_message checks who can, and tells the group (pins_changed), after
// which every member's app re-fetches the group, which carries the pins.

export const dynamic = "force-dynamic";

async function pin(request: Request, params: Promise<{ id: string }>, on: boolean) {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  await limit("pin", caller.member.id, 30);
  const { error } = await createServiceClient().rpc("d1_pin_message", { p_actor: caller.member.id, p_message: id, p_pin: on });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
}

export const POST = oneRoute<IdParams>((request, { params }) => pin(request, params, true));
export const DELETE = oneRoute<IdParams>((request, { params }) => pin(request, params, false));
