import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import {
  createLogin,
  deleteLogin,
  sanitizeRoles,
  updateLogin,
} from "@/lib/staffLogins";

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
    const roles = sanitizeRoles(body.roles);
    const password: string | undefined = body.password?.trim() || undefined;

    if (body.grant_access) {
      if (existing.auth_user_id) {
        const err = await updateLogin(supabase, existing.auth_user_id, { roles, password });
        if (err) return NextResponse.json({ error: err.message }, { status: err.status });
      } else {
        const email = (body.email ?? existing.email)?.trim();
        const result = await createLogin(supabase, {
          email: email ?? "",
          password: password ?? "",
          roles,
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
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("hr_staff")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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
  const { data: existing } = await supabase
    .from("hr_staff")
    .select("auth_user_id")
    .eq("id", id)
    .single();
  if (existing?.auth_user_id) {
    await deleteLogin(supabase, existing.auth_user_id);
  }

  const { error } = await supabase.from("hr_staff").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
