import { createServiceClient } from "@/utils/supabase/service";
import { requireMember } from "@/lib/destinyOne/auth.server";
import { canManageGroup } from "@/lib/destinyOne/chat.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody, requireUuid, type IdParams } from "@/lib/destinyOne/http";
import { sendInviteEmail } from "@/lib/destinyOne/inviteEmail.server";
import { leaderInviteSchema } from "@/lib/destinyOne/schemas";
import { getSettings } from "@/lib/destinyOne/settings.server";
import { recordNotification } from "@/lib/notify.server";

// POST /api/app/v1/one/groups/[id]/invites  { email, name, adult, note? }
//
// A group leader invites someone who isn't on Destiny One yet. Unlike a staff
// invite this never pre-approves them: when they sign in they become an access
// request, pre-filled with who invited them and to which group, and a Destiny
// One Admin confirms their age before they join (migration
// 20260927_02_destiny_one_leader_invites.sql). The leader's adult / under-18
// is only shown to staff as a hint.

export const dynamic = "force-dynamic";

export const POST = oneRoute<IdParams>(async (request, { params }) => {
  const caller = await requireMember(request);
  const id = requireUuid((await params).id, "group");
  await limit("leader-invite", caller.member.id, 10);
  const input = await readBody(request, leaderInviteSchema);

  const supabase = createServiceClient();
  const { data: group } = await supabase.from("d1_groups").select("id, name, kind, state, community_id").eq("id", id).maybeSingle();
  if (!group || group.state === "archived") throw new OneError("not_found", "Group not found.");
  if (group.kind === "announcements") throw new OneError("invalid", "Invite people to a group, not to Announcements.");
  if (!(await canManageGroup(id, caller.member.id))) throw new OneError("forbidden", "Only leaders of this group can invite people.");

  const { inviteExpiryDays } = await getSettings();
  const { error } = await supabase.from("d1_invites").insert({
    email: input.email,
    display_name: input.name,
    is_adult: input.adult,
    roles: [],
    community_ids: [group.community_id],
    group_ids: [id],
    needs_approval: true,
    note: input.note || null,
    invited_by: caller.member.auth_user_id,
    invited_by_member: caller.member.id,
    expires_at: new Date(Date.now() + inviteExpiryDays * 86_400_000).toISOString(),
    last_sent_at: new Date().toISOString(),
  });
  if (error) {
    if (error.code === "23505") throw new OneError("invalid", "There's already an open invite for this email.");
    throw fromDbError(error);
  }

  await sendInviteEmail(input.email, input.name, { needsApproval: true });
  await recordNotification({
    section: "destiny_one",
    kind: "d1_leader_invite",
    entityLabel: input.name,
    summary: `${caller.member.display_name} invited ${input.name} to ${group.name as string}. Confirm them in Requests once they sign in.`,
    href: "/admin/destiny-one/requests",
    roles: ["destiny_one_admin"],
  });

  return oneJson({ ok: true as const }, 201);
});
