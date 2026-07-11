import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { createLogin, authUsersById } from "@/lib/staffLogins";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("hr_staff")
    .select("*")
    .order("last_name", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich each row with whether the linked auth user has a login, so the
  // directory and edit modal can show backend access status.
  const authMap = await authUsersById(supabase);
  const enriched = (data ?? []).map((row) => {
    const login = row.auth_user_id ? authMap.get(row.auth_user_id) : undefined;
    return {
      ...row,
      has_login: Boolean(login),
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

  // Optionally create a backend login for this staff member.
  let auth_user_id: string | null = null;
  if (body.grant_access) {
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
    // Don't leave an orphaned login if the directory insert fails.
    if (auth_user_id) await supabase.auth.admin.deleteUser(auth_user_id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
