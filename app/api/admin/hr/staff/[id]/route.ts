import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import {
  createLogin,
  deleteLogin,
  updateLogin,
} from "@/lib/staffLogins";
import { fullName } from "@/lib/hr";
import { readForAudit, recordAudit } from "@/lib/audit.server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_staff")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

const EDITABLE = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "job_title",
  "department",
  "employment_type",
  "status",
  "start_date",
  "end_date",
  "annual_leave_entitlement",
  "notes",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServiceClient();

  // Fetch existing row — needed for the linked login and the fallback email.
  const { data: existing, error: fetchError } = await supabase
    .from("hr_staff")
    .select("auth_user_id, email")
    .eq("id", id)
    .single();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 });
  }

  const update: Record<string, unknown> = {};
  for (const key of EDITABLE) {
    if (key in body) update[key] = body[key];
  }

  // Backend-access changes — only when the modal sent a grant_access flag.
  if ("grant_access" in body) {
    const password: string | undefined = body.password?.trim() || undefined;

    if (body.grant_access) {
      if (existing.auth_user_id) {
        const err = await updateLogin(supabase, existing.auth_user_id, { password });
        if (err) return NextResponse.json({ error: err.message }, { status: err.status });
      } else {
        const email = (body.email ?? existing.email)?.trim();
        const result = await createLogin(supabase, {
          email: email ?? "",
          password: password ?? "",
        });
        if ("status" in result) {
          return NextResponse.json({ error: result.message }, { status: result.status });
        }
        update.auth_user_id = result.id;
      }
    } else if (existing.auth_user_id) {
      // Access revoked — remove the login entirely.
      await deleteLogin(supabase, existing.auth_user_id);
      update.auth_user_id = null;
    }
  }

  // Only an access change (roles/password) with no column edits — nothing to
  // write to hr_staff. Avoid an empty UPDATE (PostgREST rejects it) and just
  // return the current row.
  if (Object.keys(update).length === 0) {
    const { data, error } = await supabase
      .from("hr_staff")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Nothing changed on the row, but something did happen: this branch is
    // reached by a password reset on an existing login, which is precisely the
    // sort of thing that must not go unrecorded just because no column moved.
    await recordAudit({
      action: "update",
      section: "hr",
      entity: "staff member",
      entityId: id,
      entityLabel: fullName(data),
      summary: `Reset the backend login password for ${fullName(data)}`,
      changes: null,
    });

    return NextResponse.json(data);
  }

  const before = await readForAudit("hr_staff", id);

  const { data, error } = await supabase
    .from("hr_staff")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const accessNote =
    "grant_access" in body
      ? body.grant_access
        ? " and gave them a backend login"
        : " and removed their backend login"
      : "";

  await recordAudit({
    action: "update",
    section: "hr",
    entity: "staff member",
    entityId: id,
    entityLabel: fullName(data),
    summary: `Edited the staff record for ${fullName(data)}${accessNote}`,
    before,
    after: update,
    redactFields: ["notes", "phone"],
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServiceClient();

  // Remove the linked login first so we don't leave an account that can still
  // sign in after its staff record is gone.
  const existing = await readForAudit("hr_staff", id);
  if (existing?.auth_user_id) {
    await deleteLogin(supabase, existing.auth_user_id as string);
  }

  const { error } = await supabase.from("hr_staff").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordAudit({
    action: "delete",
    section: "hr",
    entity: "staff member",
    entityId: id,
    entityLabel: existing ? fullName(existing as { first_name: string; last_name: string }) : null,
    summary: existing
      ? `Deleted the staff record for ${fullName(existing as { first_name: string; last_name: string })}`
      : `Deleted a staff record (${id})`,
    before: existing,
    redactFields: ["notes", "phone"],
    metadata: { login_removed: Boolean(existing?.auth_user_id) },
  });

  return NextResponse.json({ success: true });
}
