import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute, readBody, requireMessageId, type IdParams } from "@/lib/destinyOne/http";
import { reactionSchema } from "@/lib/destinyOne/schemas";

// POST   /api/app/v1/one/messages/[id]/reactions  { emoji }  — add mine
// DELETE /api/app/v1/one/messages/[id]/reactions  { emoji }  — remove mine

export const dynamic = "force-dynamic";

async function react(request: Request, params: Promise<{ id: string }>, add: boolean) {
  const caller = await requireMember(request);
  const id = requireMessageId((await params).id);
  limit("react", caller.member.id, 60);
  const { emoji } = await readBody(request, reactionSchema);

  const { error } = await createServiceClient().rpc("d1_react", {
    p_actor: caller.member.id,
    p_message: id,
    p_emoji: emoji,
    p_add: add,
  });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
}

export const POST = oneRoute<IdParams>((request, { params }) => react(request, params, true));
export const DELETE = oneRoute<IdParams>((request, { params }) => react(request, params, false));
