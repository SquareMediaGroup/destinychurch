import { after } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { sealBody } from "@/lib/destinyOne/crypto.server";
import { fromDbError, limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { pushNotice } from "@/lib/destinyOne/push.server";
import { joinRequestSchema } from "@/lib/destinyOne/schemas";

// POST   /api/app/v1/one/groups/[id]/join-request  { note? }  — ask to join a group in Discover
// DELETE /api/app/v1/one/groups/[id]/join-request             — take the request back
//
// d1_request_join checks the lot (the group is open and is one this member may
// see, an under-18's group is marked suitable, not already in it or waiting, 3 at
// a time, 30 days after a decline) and answers "isn't open to join" for anything
// they shouldn't know about. The note is sealed. The group's admins are told.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  await limit("join-request", caller.member.id, 20);
  const { note } = await readBody(request, joinRequestSchema);
  const text = note?.trim() || null;

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("d1_request_join", { p_actor: caller.member.id, p_group: id, p_note: sealBody(text, id) });
  if (error) throw fromDbError(error);

  after(async () => {
    const [{ data: group }, { data: admins }] = await Promise.all([
      supabase.from("d1_groups").select("name").eq("id", id).maybeSingle(),
      supabase.from("d1_group_members").select("member_id").eq("group_id", id).eq("role", "admin").is("left_at", null),
    ]);
    // No note text in the notification: it can say personal things, and a lock screen is public.
    await Promise.all(
      (admins ?? []).map((a) =>
        pushNotice(a.member_id as string, (group?.name as string | undefined) ?? "Destiny One", `${caller.member.display_name} asked to join. Open Group info to answer.`, { groupId: id, joinRequest: true }),
      ),
    );
  });
  return oneJson({ id: Number(data) }, 201);
});

export const DELETE = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  await limit("join-request", caller.member.id, 20);
  const { error } = await createServiceClient().rpc("d1_withdraw_join_request", { p_actor: caller.member.id, p_group: id });
  if (error) throw fromDbError(error);
  return oneJson({ ok: true as const });
});
