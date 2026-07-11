// Server-only helpers for managing a staff member's backend login (the
// Supabase Auth user behind an hr_staff record).

import { createServiceClient } from "@/utils/supabase/service";

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
