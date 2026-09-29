import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { muteSchema } from "@/lib/destinyOne/schemas";

// POST /api/app/v1/one/groups/[id]/mute  { until: ISO date | null }
//
// Stops push notifications for this group until the given time; null unmutes.
// "Mute forever" is a far-future date chosen by the app.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  const { until } = await readBody(request, muteSchema);

  await createServiceClient()
    .from("d1_group_members")
    .update({ muted_until: until })
    .eq("group_id", id)
    .eq("member_id", caller.member.id)
    .is("left_at", null);

  return oneJson({ ok: true as const });
});
