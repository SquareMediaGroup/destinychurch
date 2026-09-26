import { NextResponse } from "next/server";
import { adultOnFromDateOfBirth, todayInLondon } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { INVITE_COLUMNS, toAdminInvite } from "@/lib/destinyOne/adminData.server";
import { parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { sendInviteEmail } from "@/lib/destinyOne/inviteEmail.server";
import { adultOnForDecision } from "@/lib/destinyOne/onboarding";
import { invitesSchema } from "@/lib/destinyOne/schemas";
import { getSettings } from "@/lib/destinyOne/settings.server";

// GET  /api/admin/destiny-one/invites — every invite, newest first
// POST /api/admin/destiny-one/invites  { invites: [{ email, name, adult, dateOfBirth?, roles, communityIds }] }
//
// An invite pre-approves someone: when they sign in with that email (the
// one-time code proves it's theirs) they're active straight away, with the
// name, adult status, leader roles and communities set here. One or many at
// once — each is checked on its own, and the response says which failed.

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;

  const { data, error } = await createServiceClient()
    .from("d1_invites")
    .select(INVITE_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(toAdminInvite));
}

export async function POST(request: Request) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;

  const body = await parseBody(request, invitesSchema);
  if ("response" in body) return body.response;

  const supabase = createServiceClient();
  const { inviteExpiryDays } = await getSettings();
  const expiresAt = new Date(Date.now() + inviteExpiryDays * 86_400_000).toISOString();
  const today = todayInLondon();

  // Who already has an account, by sign-in email — one query, not one per invite.
  const { data: existingRows } = await supabase.rpc("d1_admin_members", { p_status: null });
  const statusByEmail = new Map(
    ((existingRows ?? []) as { email: string | null; status: string }[])
      .filter((m) => m.email)
      .map((m) => [m.email!.toLowerCase(), m.status]),
  );

  const created: string[] = [];
  const failed: { email: string; error: string }[] = [];

  for (const invite of body.data.invites) {
    const decided = adultOnForDecision(invite, today, adultOnFromDateOfBirth);
    if (!decided.ok) {
      failed.push({ email: invite.email, error: decided.error });
      continue;
    }
    if (!invite.adult && invite.roles.length) {
      failed.push({ email: invite.email, error: "Leader roles are for adults only." });
      continue;
    }

    // Already a member? Nothing to invite.
    if (statusByEmail.get(invite.email) === "active") {
      failed.push({ email: invite.email, error: "Already has an active account." });
      continue;
    }

    const { error } = await supabase.from("d1_invites").insert({
      email: invite.email,
      display_name: invite.name,
      is_adult: invite.adult,
      adult_on: invite.adult ? (invite.dateOfBirth ? decided.adultOn : null) : decided.adultOn,
      roles: invite.roles,
      community_ids: invite.communityIds,
      invited_by: admin.userId,
      expires_at: expiresAt,
      last_sent_at: new Date().toISOString(),
    });
    if (error) {
      failed.push({
        email: invite.email,
        error: error.code === "23505" ? "There's already an open invite for this email." : "Could not create the invite.",
      });
      continue;
    }

    // A pending sign-in with this email picks the invite up next time they
    // open the app; the email tells them to.
    await sendInviteEmail(invite.email, invite.name);
    created.push(invite.email);
  }

  if (created.length) {
    await recordAudit({
      action: "create",
      section: "destiny_one",
      entity: "invite",
      entityLabel: created.length === 1 ? created[0] : `${created.length} people`,
      summary:
        created.length === 1
          ? `Invited ${created[0]} to Destiny One`
          : `Invited ${created.length} people to Destiny One`,
      // Email addresses are personal data; the count and outcome are enough.
      metadata: { invited: created.length, failed: failed.length },
    });
  }

  return NextResponse.json({ created: created.length, failed }, { status: created.length ? 201 : 422 });
}
