import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { fromDbError, limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { discoverSettingsSchema } from "@/lib/destinyOne/schemas";

// PATCH /api/app/v1/one/groups/[id]/discover  { on, blurb?, meetingDay?, meetingArea? }
//        Show or hide the group in Discover groups, with a one-line description, the day
//        it meets (1 = Monday) and the area. Leaders of the group. This cannot make a
//        group visible to under-18s: only a safeguarding admin can mark it suitable.

export const dynamic = "force-dynamic";

export const PATCH = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  await limit("discover-set", caller.member.id, 20);
  const input = await readBody(request, discoverSettingsSchema);
  const { error } = await createServiceClient().rpc("d1_set_discover", {
    p_actor: caller.member.id,
    p_group: id,
    p_on: input.on,
    p_blurb: input.blurb ?? null,
    p_day: input.meetingDay ?? null,
    p_area: input.meetingArea ?? null,
  });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
});
