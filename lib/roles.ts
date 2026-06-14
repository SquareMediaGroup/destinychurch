// Role-based access for the two backend systems.
//
// Roles live on the Supabase Auth user's `app_metadata.roles` (a string[]).
// app_metadata is the source of truth: it's returned by `getUser()` (so the
// proxy reads it with no extra query) and cannot be edited by the user
// themselves, unlike user_metadata. An account with no roles gets nothing.

export type AdminRole = "site_editor" | "administration";

export const ADMIN_ROLES: AdminRole[] = ["site_editor", "administration"];

export const ROLE_LABELS: Record<AdminRole, string> = {
  site_editor: "Site Editor",
  administration: "Administration",
};

// The system landing page each role unlocks.
export const ROLE_HOME: Record<AdminRole, string> = {
  site_editor: "/admin",
  administration: "/administration",
};

function isAdminRole(value: unknown): value is AdminRole {
  return value === "site_editor" || value === "administration";
}

// Safely read the roles off an auth user (or any object carrying app_metadata).
export function getRoles(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined,
): AdminRole[] {
  const raw = user?.app_metadata?.roles;
  if (!Array.isArray(raw)) return [];
  return raw.filter(isAdminRole);
}

// Which role a given path requires, or null if the path isn't gated by role.
export function requiredRoleForPath(pathname: string): AdminRole | null {
  if (pathname.startsWith("/administration") || pathname.startsWith("/api/administration")) {
    return "administration";
  }
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return "site_editor";
  }
  return null;
}
