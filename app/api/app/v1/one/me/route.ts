import { nameChangeAllowance } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { authenticate, loadMemberByAuthUser, requireMember, toMe, MEMBER_COLUMNS, type MemberRow } from "@/lib/destinyOne/auth.server";
import { eraseMember } from "@/lib/destinyOne/identity.server";
import { OneError, fromDbError, limit, oneJson, oneRoute, readBody } from "@/lib/destinyOne/http";
import { deleteAccountSchema, updateNameSchema } from "@/lib/destinyOne/schemas";

// GET    /api/app/v1/one/me   — the signed-in member, any status
// PATCH  /api/app/v1/one/me   — change my own first and last name
// DELETE /api/app/v1/one/me   — delete my account (GDPR erasure)
//
// Deletion takes the person out of every group straight away (which freezes
// any group that then breaks the 2-adult rule, as it should), removes their
// push tokens, consents, reactions, blocks and profile picture, anonymises their member record to
// "Former member", and deletes their sign-in. Their messages are kept, under
// that anonymised name, until the retention purge: safeguarding review is the
// lawful basis for holding them (docs/destiny-one-gdpr.md). The app must say
// this plainly on the delete screen.

export const dynamic = "force-dynamic";

export const GET = oneRoute(async (request) => {
  const user = await authenticate(request);
  const member = await loadMemberByAuthUser(user.id);
  if (!member) {
    throw new OneError("not_verified", "Finish signing in first.");
  }
  return oneJson(await toMe(member));
});

export const PATCH = oneRoute(async (request) => {
  const { member } = await requireMember(request, { requireConsent: false });
  await limit("rename", member.id, 5);
  const input = await readBody(request, updateNameSchema);

  // Two changes in any 30 days. Saving the name as it already is doesn't use one.
  if (input.firstName === member.first_name && input.lastName === member.last_name) return oneJson(await toMe(member));
  const allowance = nameChangeAllowance(member.name_change_log);
  if (allowance.left === 0) {
    const when = new Date(allowance.nextAt as string).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Europe/London" });
    throw new OneError("rule_violation", `You can only change your name twice a month. You can change it again on ${when}.`);
  }

  // display_name follows from first/last via the d1_members_sync_names trigger.
  const now = new Date();
  const recent = (member.name_change_log ?? []).filter((t) => now.getTime() - new Date(t).getTime() < 30 * 24 * 60 * 60 * 1000);
  const { data, error } = await createServiceClient()
    .from("d1_members")
    .update({ first_name: input.firstName, last_name: input.lastName, name_edited_at: now.toISOString(), name_change_log: [...recent, now.toISOString()] })
    .eq("id", member.id)
    .select(MEMBER_COLUMNS)
    .single();
  if (error || !data) {
    console.error("⚠️ Destiny One name change failed:", error?.message);
    throw new OneError("unavailable", "Couldn't save your name. Please try again.");
  }

  console.log(`✏️ Destiny One member ${member.id} changed their name`);
  return oneJson(await toMe(data as MemberRow));
});

export const DELETE = oneRoute(async (request) => {
  const user = await authenticate(request);
  await limit("delete-account", user.id, 3);
  await readBody(request, deleteAccountSchema);

  const supabase = createServiceClient();
  const member = await loadMemberByAuthUser(user.id);
  if (member) {
    const error = await eraseMember(member.id);
    if (error) throw fromDbError(error);
  }

  const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
  if (authError) {
    console.error("⚠️ Destiny One: member erased but auth user delete failed:", authError.message);
    throw new OneError("unavailable", "Your data was removed but we couldn't finish closing the account. Please try again.");
  }

  console.log(`🗑️ Destiny One account deleted (member ${member?.id ?? "none"})`);
  return oneJson({ deleted: true as const });
});
