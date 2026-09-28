import { createServiceClient } from "@/utils/supabase/service";
import { requireMember, toMe } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute, requireUuid, type IdParams } from "@/lib/destinyOne/http";

// POST   /api/app/v1/one/members/[id]/block — block someone
// DELETE /api/app/v1/one/members/[id]/block — unblock them
//
// Blocking hides that person's messages and notifications for the caller only
// (d1_set_block, 20260928_01). Nobody leaves a group, so the 2-adult rule is
// untouched, and nothing is hidden from safeguarding: the block is logged as a
// safeguarding event. Returns the caller's D1Me with the updated `blocked` list.

export const dynamic = "force-dynamic";

async function setBlock(request: Request, { params }: IdParams, block: boolean) {
  const caller = await requireMember(request);
  const target = requireUuid((await params).id, "person");
  limit("block", caller.member.id, 20);

  const { error } = await createServiceClient().rpc("d1_set_block", {
    p_actor: caller.member.id,
    p_target: target,
    p_block: block,
  });
  if (error) throw fromDbError(error);
  return oneJson(await toMe(caller.member));
}

export const POST = oneRoute<IdParams>((request, context) => setBlock(request, context, true));
export const DELETE = oneRoute<IdParams>((request, context) => setBlock(request, context, false));
