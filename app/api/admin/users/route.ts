import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { createLogin } from "@/lib/staffLogins";
import { ADMIN_ROLES, type AdminRole } from "@/lib/adminRoles";

function rolesFromBody(body: Record<string, unknown>): Record<AdminRole, boolean> {
  const roles = {} as Record<AdminRole, boolean>;
  for (const role of ADMIN_ROLES) roles[role] = Boolean(body[role]);
  return roles;
}

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("admin_roles")
    .select("*")
    .order("email", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const body = await request.json();
  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "An email is required." }, { status: 400 });
  }

  const supabase = createServiceClient();

  const result = await createLogin(supabase, { email, password: body.password ?? "" });
  if ("status" in result) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  const { data, error } = await supabase
    .from("admin_roles")
    .insert({ auth_user_id: result.id, email, ...rolesFromBody(body) })
    .select()
    .single();

  if (error) {
    // Don't leave an orphaned login if the role row fails to insert.
    await supabase.auth.admin.deleteUser(result.id);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
