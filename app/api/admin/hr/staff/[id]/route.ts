import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import {
  createLogin,
  deleteLogin,
  updateLogin,
  isAdminIdentity,
  assertAdminAvailable,
  adminIdentitiesByAuthUserId,
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

  const adminMap = await adminIdentitiesByAuthUserId(supabase);
  const admin = data.auth_user_id ? adminMap.get(data.auth_user_id) : undefined;

  return NextResponse.json({
    ...data,
    linked_admin_email: admin?.email ?? null,
    linked_admin_roles: admin?.roles ?? [],
  });
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

  // Backend-access changes — only when the modal sent a login_mode. Access is
  // mandatory (no "revoke" path); this only ever creates/resets a login or
  // swaps which login is linked.
  let loginNote = "";
  let oldAuthUserIdToDelete: string | null = null;
  if ("login_mode" in body) {
    const password: string | undefined = body.password?.trim() || undefined;
    const currentIsAdmin = existing.auth_user_id
      ? await isAdminIdentity(supabase, existing.auth_user_id)
      : false;

    if (body.login_mode === "new") {
      if (existing.auth_user_id && !currentIsAdmin) {
        // Staff-only login already exists — reset its password, no swap.
        const err = await updateLogin(supabase, existing.auth_user_id, { password });
        if (err) return NextResponse.json({ error: err.message }, { status: err.status });
        loginNote = " and reset their login password";
      } else {
        // No login yet, or the current login is a shared admin identity —
        // create a fresh, staff-only login and swap to it.
        const email = (body.email ?? existing.email)?.trim();
        const result = await createLogin(supabase, {
          email: email ?? "",
          password: password ?? "",
        });
        if ("status" in result) {
          return NextResponse.json({ error: result.message }, { status: result.status });
        }
        update.auth_user_id = result.id;
        loginNote = " and gave them their own new login";
        if (existing.auth_user_id && !currentIsAdmin) oldAuthUserIdToDelete = existing.auth_user_id;
      }
    } else if (body.login_mode === "link") {
      if (!body.linked_admin_auth_user_id) {
        return NextResponse.json({ error: "Choose an admin to link." }, { status: 400 });
      }
      const err = await assertAdminAvailable(supabase, body.linked_admin_auth_user_id, {
        excludeStaffId: id,
      });
      if (err) return NextResponse.json({ error: err.message }, { status: err.status });

      if (body.linked_admin_auth_user_id !== existing.auth_user_id) {
        update.auth_user_id = body.linked_admin_auth_user_id;
        loginNote = " and linked them to their existing admin login";
        if (existing.auth_user_id && !currentIsAdmin) oldAuthUserIdToDelete = existing.auth_user_id;
      }
    } else {
      return NextResponse.json({ error: "Choose how this person will sign in." }, { status: 400 });
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
      summary: `Edited the staff record for ${fullName(data)}${loginNote}`,
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

  if (error) {
    const message =
      error.code === "23505"
        ? "This admin is already linked to another staff record."
        : error.message;
    return NextResponse.json({ error: message }, { status: error.code === "23505" ? 409 : 500 });
  }

  // Clean up the old login only after the swap succeeded, and only if it was
  // staff-only — a shared admin identity is unlinked, never deleted.
  if (oldAuthUserIdToDelete) await deleteLogin(supabase, oldAuthUserIdToDelete);

  await recordAudit({
    action: "update",
    section: "hr",
    entity: "staff member",
    entityId: id,
    entityLabel: fullName(data),
    summary: `Edited the staff record for ${fullName(data)}${loginNote}`,
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

  // Remove the linked login first so we don't leave a staff-only account
  // that can still sign in after its staff record is gone — but never touch
  // a login that's shared with an existing admin: that account (and their
  // admin_roles row, which cascades off it) must survive this delete.
  const existing = await readForAudit("hr_staff", id);
  if (existing?.auth_user_id) {
    const sharedWithAdmin = await isAdminIdentity(supabase, existing.auth_user_id as string);
    if (!sharedWithAdmin) await deleteLogin(supabase, existing.auth_user_id as string);
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
