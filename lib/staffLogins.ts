// Server-only helpers for managing a staff member's backend login (the
// Supabase Auth user behind an hr_staff record). Roles are stored on the auth
// user's app_metadata.roles — see lib/roles.ts.

import { createServiceClient } from "@/utils/supabase/service";
import { ADMIN_ROLES, type AdminRole } from "@/lib/roles";

type ServiceClient = ReturnType<typeof createServiceClient>;

export const MIN_PASSWORD_LENGTH = 8;

export type LoginError = { status: number; message: string };

// Keep only valid, known role keys from arbitrary request input.
export function sanitizeRoles(input: unknown): AdminRole[] {
  if (!Array.isArray(input)) return [];
  return ADMIN_ROLES.filter((role) => input.includes(role));
}

function duplicateEmail(message: string): boolean {
  return /already|registered|exists/i.test(message);
}

// Create an auth user with the given email/password/roles.
export async function createLogin(
  supabase: ServiceClient,
  { email, password, roles }: { email: string; password: string; roles: AdminRole[] },
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
    app_metadata: { roles },
  });

  if (error) {
    return duplicateEmail(error.message)
      ? { status: 409, message: "An account with that email already exists." }
      : { status: 500, message: error.message };
  }
  return { id: data.user.id };
}

// Update roles (and optionally the password) of an existing auth user.
export async function updateLogin(
  supabase: ServiceClient,
  authUserId: string,
  { roles, password }: { roles: AdminRole[]; password?: string },
): Promise<LoginError | null> {
  if (password && password.length < MIN_PASSWORD_LENGTH) {
    return { status: 400, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  const { error } = await supabase.auth.admin.updateUserById(authUserId, {
    app_metadata: { roles },
    ...(password ? { password } : {}),
  });
  return error ? { status: 500, message: error.message } : null;
}

// Remove an auth user (revoking their login). Ignores "not found".
export async function deleteLogin(
  supabase: ServiceClient,
  authUserId: string,
): Promise<void> {
  await supabase.auth.admin.deleteUser(authUserId);
}

// Map of auth-user id → { roles, email } for enriching staff lists.
export async function rolesByUserId(
  supabase: ServiceClient,
): Promise<Map<string, { roles: AdminRole[]; email: string | undefined }>> {
  const map = new Map<string, { roles: AdminRole[]; email: string | undefined }>();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error || !data) return map;
  for (const user of data.users) {
    map.set(user.id, {
      roles: sanitizeRoles((user.app_metadata as { roles?: unknown })?.roles),
      email: user.email,
    });
  }
  return map;
}
