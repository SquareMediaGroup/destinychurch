import { NextResponse } from "next/server";
import { adultOnFromDateOfBirth, todayInLondon } from "@destiny/shared";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { communityMemberships, getMember } from "@/lib/destinyOne/adminData.server";
import { dbFailure, parseBody, requireDestinyOneAdmin } from "@/lib/destinyOne/admin.server";
import { ChurchSuiteUnavailable, getChild, getContact } from "@/lib/destinyOne/churchsuite.server";
import { adultOnForDecision } from "@/lib/destinyOne/onboarding";
import { adminMemberSchema } from "@/lib/destinyOne/schemas";

// GET    /api/admin/destiny-one/members/[id] — one member, with their communities and groups
// PATCH  /api/admin/destiny-one/members/[id]
//          { displayName?, roles?, status?: active|suspended, age?: { adult, dateOfBirth? },
//            churchsuite?: { kind, id } | null }
//        Staff are the source of truth for names and ages now (not ChurchSuite).
//        Suspending takes them out of every group's counts at once; any group
//        left with < 2 adults pauses. Leader roles need an adult (the database
//        enforces it). A ChurchSuite link here is for reference only.
// DELETE /api/admin/destiny-one/members/[id] — GDPR erasure, as if they'd
//        deleted their own account.

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;

  const member = await getMember(id);
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ member, ...(await communityMemberships(id)) });
}

export async function PATCH(request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;

  const body = await parseBody(request, adminMemberSchema);
  if ("response" in body) return body.response;
  const input = body.data;

  const before = await getMember(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (input.displayName) update.display_name = input.displayName;
  if (input.roles) update.roles = input.roles;
  if (input.status) {
    if (input.status === "active" && !before.verifiedAt && !input.age) {
      return NextResponse.json(
        { error: "Confirm whether they're an adult or under 18 before activating them." },
        { status: 422 },
      );
    }
    update.status = input.status;
  }
  if (input.age) {
    const decided = adultOnForDecision(input.age, todayInLondon(), adultOnFromDateOfBirth);
    if (!decided.ok) return NextResponse.json({ error: decided.error }, { status: 422 });
    Object.assign(update, {
      adult_on: decided.adultOn,
      verified_at: new Date().toISOString(),
      verified_by: admin.userId,
      verification_source: "admin",
    });
  }
  if (input.churchsuite !== undefined) {
    if (input.churchsuite === null) {
      Object.assign(update, { churchsuite_contact_id: null, churchsuite_child_id: null });
    } else {
      try {
        const person =
          input.churchsuite.kind === "contact"
            ? await getContact(input.churchsuite.id)
            : await getChild(input.churchsuite.id);
        if (!person) return NextResponse.json({ error: "No such ChurchSuite record." }, { status: 404 });
      } catch (err) {
        if (err instanceof ChurchSuiteUnavailable) {
          return NextResponse.json({ error: "ChurchSuite isn't available." }, { status: 503 });
        }
        throw err;
      }
      Object.assign(update, {
        churchsuite_contact_id: input.churchsuite.kind === "contact" ? input.churchsuite.id : null,
        churchsuite_child_id: input.churchsuite.kind === "child" ? input.churchsuite.id : null,
      });
    }
  }

  const { error } = await createServiceClient().from("d1_members").update(update).eq("id", id);
  if (error) return dbFailure(error);

  const after = await getMember(id);
  await recordAudit({
    action: "update",
    section: "destiny_one",
    entity: "app member",
    entityId: id,
    entityLabel: after?.displayName ?? before.displayName,
    summary: input.status === "suspended"
      ? `Suspended the Destiny One account "${before.displayName}"`
      : input.status === "active" && before.status !== "active"
        ? `Reinstated the Destiny One account "${before.displayName}"`
        : `Changed the Destiny One account "${before.displayName}"`,
    before: { displayName: before.displayName, status: before.status, roles: before.roles, isAdult: before.isAdult },
    after: after
      ? { displayName: after.displayName, status: after.status, roles: after.roles, isAdult: after.isAdult }
      : null,
  });
  return NextResponse.json({ member: after });
}

export async function DELETE(_request: Request, { params }: Params) {
  const admin = await requireDestinyOneAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;

  const supabase = createServiceClient();
  const { data: row } = await supabase
    .from("d1_members")
    .select("id, display_name, auth_user_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { error } = await supabase.rpc("d1_erase_member", { p_member: id });
  if (error) return dbFailure(error);
  if (row.auth_user_id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(row.auth_user_id);
    if (authError) console.error("⚠️ Destiny One erase: auth user delete failed:", authError.message);
  }

  await recordAudit({
    action: "delete",
    section: "destiny_one",
    entity: "app member",
    entityId: id,
    entityLabel: row.display_name,
    summary: `Deleted the Destiny One account "${row.display_name}"`,
  });
  return NextResponse.json({ ok: true });
}
