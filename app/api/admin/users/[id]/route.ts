import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { createServiceClient } from "@/utils/supabase/service";
import { deleteLogin } from "@/lib/staffLogins";
import { ADMIN_ROLES, type AdminRole } from "@/lib/adminRoles";
import { readForAudit, recordAudit } from "@/lib/audit.server";

function rolesFromBody(body: Record<string, unknown>): Record<AdminRole, boolean> {
  const roles = {} as Record<AdminRole, boolean>;
  for (const role of ADMIN_ROLES) roles[role] = Boolean(body[role]);
  return roles;
}

async function wouldRemoveLastSuperAdmin(
  supabase: ReturnType<typeof createServiceClient>,
  authUserId: string,
  nextSuperAdmin: boolean,
): Promise<boolean> {
  if (nextSuperAdmin) return false;
  const { data: current } = await supabase
    .from("admin_roles")
    .select("super_admin")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (!current?.super_admin) return false;

  const { count } = await supabase
    .from("admin_roles")
    .select("auth_user_id", { count: "exact", head: true })
    .eq("super_admin", true);
  return (count ?? 0) <= 1;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await request.json();
  const supabase = createServiceClient();
  const nextRoles = rolesFromBody(body);

  if (await wouldRemoveLastSuperAdmin(supabase, id, nextRoles.super_admin)) {
    return NextResponse.json(
      { error: "Can't remove Super Admin from the last remaining Super Admin." },
      { status: 400 },
    );
  }

  const before = await readForAudit("admin_roles", id, "*", "auth_user_id");

  const { data, error } = await supabase
    .from("admin_roles")
    .update({ ...nextRoles, updated_at: new Date().toISOString() })
    .eq("auth_user_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Spell the change out as gained/lost rather than leaving seven booleans in
  // the diff: "who gave them Super Admin" is the question this answers.
  const gained = ADMIN_ROLES.filter((role) => nextRoles[role] && !before?.[role]);
  const lost = ADMIN_ROLES.filter((role) => !nextRoles[role] && before?.[role]);
  const parts = [
    gained.length ? `granted ${gained.join(", ")}` : "",
    lost.length ? `removed ${lost.join(", ")}` : "",
  ].filter(Boolean);

  await recordAudit({
    action: "update",
    section: "users",
    entity: "admin user",
    entityId: id,
    entityLabel: data.email,
    summary: parts.length
      ? `Changed access for ${data.email}: ${parts.join(" and ")}`
      : `Saved access for ${data.email} with no change`,
    before,
    after: data,
    metadata: { granted: gained, removed: lost },
  });

  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const cookieStore = await cookies();
  const userClient = createClient(cookieStore);
  const {
    data: { user: currentUser },
  } = await userClient.auth.getUser();
  if (currentUser?.id === id) {
    return NextResponse.json({ error: "You can't remove your own access." }, { status: 400 });
  }

  const supabase = createServiceClient();
  if (await wouldRemoveLastSuperAdmin(supabase, id, false)) {
    return NextResponse.json(
      { error: "Can't remove the last remaining Super Admin." },
      { status: 400 },
    );
  }

  const before = await readForAudit("admin_roles", id, "*", "auth_user_id");

  await deleteLogin(supabase, id);
  const { error } = await supabase.from("admin_roles").delete().eq("auth_user_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Note the audit row outlives the auth.users row it points at — see the
  // comment on the missing foreign key in the migration.
  await recordAudit({
    action: "delete",
    section: "users",
    entity: "admin user",
    entityId: id,
    entityLabel: (before?.email as string) ?? id,
    summary: `Removed the admin login for ${before?.email ?? id}`,
    before,
  });

  return NextResponse.json({ ok: true });
}
