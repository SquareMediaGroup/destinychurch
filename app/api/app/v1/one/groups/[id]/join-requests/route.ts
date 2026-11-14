import type { D1JoinRequest } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { canManageGroup } from "@/lib/destinyOne/chat.server";
import { openBody, UNREADABLE } from "@/lib/destinyOne/crypto.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, requireUuid, type IdParams } from "@/lib/destinyOne/http";

// GET /api/app/v1/one/groups/[id]/join-requests
//        The requests waiting for this group, oldest first, with the person's name and
//        their note (opened). Only people who manage the group.

export const dynamic = "force-dynamic";

export const GET = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  await limit("join-requests", caller.member.id, 60);
  if (!(await canManageGroup(id, caller.member.id))) throw new OneError("forbidden", "Only the group's leaders can see its requests.");

  const { data, error } = await createServiceClient()
    .from("d1_join_requests")
    .select("id, note, created_at, d1_members!d1_join_requests_member_id_fkey!inner(id, display_name)")
    .eq("group_id", id)
    .eq("status", "pending")
    .order("created_at");
  if (error) throw fromDbError(error);
  const requests: D1JoinRequest[] = (data ?? []).map((r) => {
    const m = r.d1_members as unknown as { id: string; display_name: string };
    const note = openBody(r.note as string | null, id);
    return { id: r.id as number, groupId: id, member: { id: m.id, displayName: m.display_name }, note: note === UNREADABLE ? null : note, createdAt: r.created_at as string };
  });
  return oneJson(requests);
});
