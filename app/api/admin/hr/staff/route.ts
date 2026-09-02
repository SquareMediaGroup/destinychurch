import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import {
  createLogin,
  authUsersById,
  assertAdminAvailable,
  adminIdentitiesByAuthUserId,
} from "@/lib/staffLogins";
import { fullName } from "@/lib/hr";
import { recordAudit } from "@/lib/audit.server";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_staff")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich each row with whether the linked auth user has a login, and
  // whether that login is shared with an existing admin, so the directory
  // and edit modal can show backend access status correctly.
  const [authMap, adminMap] = await Promise.all([
    authUsersById(supabase),
    adminIdentitiesByAuthUserId(supabase),
  ]);
  const enriched = (data ?? []).map((row) => {
    const login = row.auth_user_id ? authMap.get(row.auth_user_id) : undefined;
    const admin = row.auth_user_id ? adminMap.get(row.auth_user_id) : undefined;
    return {
      ...row,
      has_login: Boolean(login),
      linked_admin_email: admin?.email ?? null,
      linked_admin_roles: admin?.roles ?? [],
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: Request) {
  const body = await request.json();
  const first_name = body.first_name?.trim();
  const last_name = body.last_name?.trim();

  if (!first_name || !last_name) {
    return NextResponse.json(
      { error: "First and last name are required" },
      { status: 400 },
    );
  }

  const email = body.email?.trim() || null;
  const supabase = createServiceClient();

  // Every staff record needs exactly one linked login, either a brand-new
  // one or an existing admin's — there's no "no login" option.
  let auth_user_id: string;
  let linkedExisting = false;
  if (body.login_mode === "link") {
    if (!body.linked_admin_auth_user_id) {
      return NextResponse.json(
        { error: "Choose an admin to link." },
        { status: 400 },
      );
    }
    const err = await assertAdminAvailable(supabase, body.linked_admin_auth_user_id);
    if (err) return NextResponse.json({ error: err.message }, { status: err.status });
    auth_user_id = body.linked_admin_auth_user_id;
    linkedExisting = true;
  } else if (body.login_mode === "new") {
    if (!email) {
      return NextResponse.json(
        { error: "An email is required to create a login." },
        { status: 400 },
      );
    }
    const result = await createLogin(supabase, {
      email,
      password: body.password ?? "",
    });
    if ("status" in result) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }
    auth_user_id = result.id;
  } else {
    return NextResponse.json(
      { error: "Choose how this person will sign in." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("hr_staff")
    .insert({
      first_name,
      last_name,
      email,
      phone: body.phone?.trim() || null,
      job_title: body.job_title?.trim() || null,
      department: body.department?.trim() || null,
      employment_type: body.employment_type || "full_time",
      status: body.status || "active",
      start_date: body.start_date || null,
      end_date: body.end_date || null,
      annual_leave_entitlement: body.annual_leave_entitlement ?? 0,
      notes: body.notes?.trim() || null,
      auth_user_id,
    })
    .select()
    .single();

  if (error) {
    // Don't leave an orphaned login if the directory insert fails — but
    // never delete a linked admin's own auth user.
    if (!linkedExisting) await supabase.auth.admin.deleteUser(auth_user_id);
    const message =
      error.code === "23505"
        ? "This admin is already linked to another staff record."
        : error.message;
    return NextResponse.json({ error: message }, { status: error.code === "23505" ? 409 : 500 });
  }

  // HR values are held back from the log the way HR is held back from ⌘K
  // search: who did what to whose record is the point, the notes on it aren't.
  await recordAudit({
    action: "create",
    section: "hr",
    entity: "staff member",
    entityId: data.id,
    entityLabel: fullName(data),
    summary: `Added ${fullName(data)} to the staff directory${
      linkedExisting
        ? " and linked them to their existing admin login"
        : " and created a login for them"
    }`,
    after: data,
    redactFields: ["notes", "phone"],
    metadata: { login_mode: linkedExisting ? "link" : "new" },
  });

  return NextResponse.json(data, { status: 201 });
}
