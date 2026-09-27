import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { sendInviteEmail } from "@/lib/destinyOne/inviteEmail.server";
import { invitePatchSchema } from "@/lib/destinyOne/schemas";
import { getSettings } from "@/lib/destinyOne/settings.server";

// PATCH /api/admin/destiny-one/invites/[id]  — body { action } is resend or revoke
//
// Resend emails it again and restarts the expiry clock (an expired invite
// becomes usable again). Revoke stops it being accepted and, if they never
// signed in, erases the member created for the invite.

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;

  const body = await parseBody(request, invitePatchSchema);
  if ("response" in body) return body.response;

  const supabase = createServiceClient();
  const { data: invite } = await supabase
    .from("d1_invites")
    .select("id, email, display_name, status, member_id")
    .eq("id", id)
    .maybeSingle();
  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (invite.status === "accepted" || invite.status === "revoked") {
    return NextResponse.json({ error: `This invite was already ${invite.status}.` }, { status: 409 });
  }

  if (body.data.action === "revoke") {
    await supabase.from("d1_invites").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", id);
    // They never signed in: remove the member created for the invite (leaves
    // any groups they were put in; the rules re-check as usual).
    if (invite.member_id) {
      const { data: m } = await supabase.from("d1_members").select("auth_user_id").eq("id", invite.member_id).maybeSingle();
      if (m && !m.auth_user_id) {
        const { error: eraseError } = await supabase.rpc("d1_erase_member", { p_member: invite.member_id });
        if (eraseError) console.error("⚠️ Destiny One revoke: member not erased:", eraseError.message);
      }
    }
  } else {
    const { inviteExpiryDays } = await getSettings();
    const { error } = await supabase
      .from("d1_invites")
      .update({
        status: "pending",
        expires_at: new Date(Date.now() + inviteExpiryDays * 86_400_000).toISOString(),
        last_sent_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      return NextResponse.json(
        { error: error.code === "23505" ? "There's already a newer open invite for this email." : "Could not resend." },
        { status: 409 },
      );
    }
    await sendInviteEmail(invite.email, invite.display_name);
  }

  await recordAudit({
    action: body.data.action === "revoke" ? "delete" : "update",
    section: "destiny_one",
    entity: "invite",
    entityId: id,
    entityLabel: invite.display_name,
    summary: body.data.action === "revoke"
      ? `Revoked the Destiny One invite for ${invite.display_name}`
      : `Resent the Destiny One invite to ${invite.display_name}`,
  });
  return NextResponse.json({ ok: true });
}
