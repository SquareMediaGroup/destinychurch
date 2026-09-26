import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { recordAudit } from "@/lib/audit.server";
import { dbFailure, requireSafeguardingAdmin } from "@/lib/destinyOne/admin.server";
import { ChurchSuiteUnavailable, getChild, getContact } from "@/lib/destinyOne/churchsuite.server";
import { adminMemberSchema } from "@/lib/destinyOne/schemas";

// PATCH /api/admin/destiny-one/members/[id]
//   { link?: { kind: "contact"|"child", id }, status?, roles? }
//
// • link    — tie a pending account to a specific ChurchSuite record. Name
//             and adult status come from that record, never typed in here.
// • status  — suspend (takes them out of every group's counts at once; groups
//             that drop below 2 adults freeze) or reinstate.
// • roles   — group_leader / senior_leadership. Adults only; the database
//             refuses otherwise.

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSafeguardingAdmin();
  if (admin instanceof NextResponse) return admin;
  const id = (await params).id;

  const parsed = adminMemberSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const input = parsed.data;

  const supabase = createServiceClient();
  const { data: before } = await supabase
    .from("d1_members")
    .select("id, display_name, status, roles, churchsuite_contact_id, churchsuite_child_id")
    .eq("id", id)
    .maybeSingle();
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (before.status === "deleted") return NextResponse.json({ error: "This account was deleted." }, { status: 409 });

  const update: Record<string, unknown> = {};

  if (input.link) {
    let person;
    try {
      person = input.link.kind === "contact" ? await getContact(input.link.id) : await getChild(input.link.id);
    } catch (err) {
      if (err instanceof ChurchSuiteUnavailable) {
        return NextResponse.json({ error: "ChurchSuite isn't responding. Try again shortly." }, { status: 503 });
      }
      throw err;
    }
    if (!person) return NextResponse.json({ error: "No such ChurchSuite record." }, { status: 404 });
    Object.assign(update, {
      display_name: person.displayName,
      adult_on: person.adultOn,
      churchsuite_contact_id: person.kind === "contact" ? person.id : null,
      churchsuite_child_id: person.kind === "child" ? person.id : null,
      last_synced_at: new Date().toISOString(),
      status: input.status ?? (person.status === "active" ? "active" : "pending"),
    });
  }
  if (input.status) update.status = input.status;
  if (input.roles) update.roles = input.roles;

  if (update.status === "active" && !input.link && !before.churchsuite_contact_id && !before.churchsuite_child_id) {
    return NextResponse.json({ error: "Link this account to a ChurchSuite record before activating it." }, { status: 422 });
  }

  const { data: after, error } = await supabase
    .from("d1_members")
    .update(update)
    .eq("id", id)
    .select("id, display_name, status, roles, churchsuite_contact_id, churchsuite_child_id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "That ChurchSuite record is already linked to another account." }, { status: 409 });
    }
    return dbFailure(error);
  }

  await recordAudit({
    action: "update",
    section: "safeguarding",
    entity: "app member",
    entityId: id,
    entityLabel: after.display_name,
    summary: input.link
      ? `Linked the Destiny One account "${after.display_name}" to ChurchSuite ${input.link.kind} #${input.link.id}`
      : `Changed the Destiny One account "${after.display_name}"`,
    before,
    after,
  });
  return NextResponse.json({ member: after });
}
