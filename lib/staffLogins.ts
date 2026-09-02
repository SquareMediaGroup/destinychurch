// Server-only helpers for managing a staff member's backend login (the
// Supabase Auth user behind an hr_staff record).

import { createServiceClient } from "@/utils/supabase/service";
import { roleLabel, ADMIN_ROLES, type AdminRole } from "@/lib/adminRoles";

// Spelled out (not built from ADMIN_ROLES.join()) so PostgREST's select
// string parser can type it — a template-string select can't be parsed at
// the type level. Keep in step with ADMIN_ROLES.
const ADMIN_ROLE_COLUMNS =
  "training_admin, event_admin, store_admin, site_admin, host, hr_admin, design_admin, super_admin";

type ServiceClient = ReturnType<typeof createServiceClient>;

export const MIN_PASSWORD_LENGTH = 8;

export type LoginError = { status: number; message: string };

function duplicateEmail(message: string): boolean {
  return /already|registered|exists/i.test(message);
}

// Create an auth user with the given email/password.
export async function createLogin(
  supabase: ServiceClient,
  { email, password }: { email: string; password: string },
): Promise<{ id: string } | LoginError> {
  const trimmed = email.trim();
  if (!trimmed) return { status: 400, message: "An email is required to create a login." };
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return { status: 400, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: trimmed,
    password,
    email_confirm: true,
  });

  if (error) {
    return duplicateEmail(error.message)
      ? { status: 409, message: "An account with that email already exists." }
      : { status: 500, message: error.message };
  }
  return { id: data.user.id };
}

// Update the password of an existing auth user.
export async function updateLogin(
  supabase: ServiceClient,
  authUserId: string,
  { password }: { password?: string },
): Promise<LoginError | null> {
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return { status: 400, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (!password) return null;
  const { error } = await supabase.auth.admin.updateUserById(authUserId, { password });
  return error ? { status: 500, message: error.message } : null;
}

// Remove an auth user (revoking their login). Ignores "not found".
export async function deleteLogin(
  supabase: ServiceClient,
  authUserId: string,
): Promise<void> {
  await supabase.auth.admin.deleteUser(authUserId);
}

// Map of auth-user id → email, for enriching staff lists with "has a login".
export async function authUsersById(
  supabase: ServiceClient,
): Promise<Map<string, { email: string | undefined }>> {
  const map = new Map<string, { email: string | undefined }>();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error || !data) return map;
  for (const user of data.users) {
    map.set(user.id, { email: user.email });
  }
  return map;
}

// Does this auth user also have an admin_roles row? A staff record linked to
// one of these is sharing a login with an existing /admin user — their auth
// account must never be deleted or password-reset from the HR screens, only
// unlinked.
export async function isAdminIdentity(
  supabase: ServiceClient,
  authUserId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("admin_roles")
    .select("auth_user_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  return Boolean(data);
}

// Map of auth-user id → { email, roles } for every admin_roles row, for
// enriching staff records so the edit modal can show "linked to an existing
// admin" instead of treating them as an ordinary staff-only login.
export async function adminIdentitiesByAuthUserId(
  supabase: ServiceClient,
): Promise<Map<string, { email: string | null; roles: string[] }>> {
  const map = new Map<string, { email: string | null; roles: string[] }>();
  const { data } = await supabase
    .from("admin_roles")
    .select(`auth_user_id, email, ${ADMIN_ROLE_COLUMNS}`);
  for (const admin of data ?? []) {
    map.set(admin.auth_user_id, {
      email: admin.email,
      roles: ADMIN_ROLES.filter((role: AdminRole) => admin[role]).map(roleLabel),
    });
  }
  return map;
}

export type LinkableAdmin = { id: string; email: string | null; roles: string[] };

// admin_roles rows not yet claimed by any hr_staff record (or only claimed by
// excludeStaffId, so an edit screen still lists the admin currently linked to
// the record being edited).
export async function listUnlinkedAdmins(
  supabase: ServiceClient,
  { excludeStaffId }: { excludeStaffId?: string } = {},
): Promise<LinkableAdmin[]> {
  const [{ data: admins }, { data: staffRows }] = await Promise.all([
    supabase
      .from("admin_roles")
      .select(`auth_user_id, email, ${ADMIN_ROLE_COLUMNS}`)
      .order("email", { ascending: true }),
    supabase.from("hr_staff").select("id, auth_user_id").not("auth_user_id", "is", null),
  ]);

  const claimed = new Set(
    (staffRows ?? [])
      .filter((row) => row.id !== excludeStaffId)
      .map((row) => row.auth_user_id as string),
  );

  return (admins ?? [])
    .filter((admin) => !claimed.has(admin.auth_user_id))
    .map((admin) => ({
      id: admin.auth_user_id,
      email: admin.email,
      roles: ADMIN_ROLES.filter((role: AdminRole) => admin[role]).map(roleLabel),
    }));
}

// Confirms an admin_roles auth_user_id exists and isn't already linked to a
// different staff record. Shared by the "link an existing admin" path on
// create and edit.
export async function assertAdminAvailable(
  supabase: ServiceClient,
  authUserId: string,
  { excludeStaffId }: { excludeStaffId?: string } = {},
): Promise<LoginError | null> {
  const { data: admin } = await supabase
    .from("admin_roles")
    .select("auth_user_id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (!admin) return { status: 404, message: "That admin account could not be found." };

  const { data: claimedBy } = await supabase
    .from("hr_staff")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (claimedBy && claimedBy.id !== excludeStaffId) {
    return { status: 409, message: "This admin is already linked to another staff record." };
  }
  return null;
}
