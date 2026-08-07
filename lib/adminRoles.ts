// Access-level roles for /admin. Five independent booleans per user, stored
// in the `admin_roles` table (service-only RLS — always read via
// createServiceClient()). super_admin is checked separately from
// ROUTE_RULES and always passes, so it doesn't need repeating in every rule.

import type { createServiceClient } from "@/utils/supabase/service";

export type AdminRole =
  | "training_admin"
  | "event_admin"
  | "store_admin"
  | "site_admin"
  | "super_admin";

export const ADMIN_ROLES: AdminRole[] = [
  "training_admin",
  "event_admin",
  "store_admin",
  "site_admin",
  "super_admin",
];

export type RoleFlags = Record<AdminRole, boolean>;

export const NO_ROLES: RoleFlags = {
  training_admin: false,
  event_admin: false,
  store_admin: false,
  site_admin: false,
  super_admin: false,
};

type ServiceClient = ReturnType<typeof createServiceClient>;

// Path prefixes an authenticated user needs a specific role for. Checked in
// order; the first match wins. Anything under /admin or /api/admin that
// isn't listed here is Super Admin only (fail closed) — new admin sections
// must be assigned a role explicitly.
const ROUTE_RULES: { pattern: RegExp; roles: AdminRole[] }[] = [
  // Training
  { pattern: /^\/admin\/training(\/|$)/, roles: ["training_admin"] },
  { pattern: /^\/api\/admin\/training(\/|$)/, roles: ["training_admin"] },

  // Event admin — courses
  { pattern: /^\/admin\/alpha(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/admin\/recovery(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/admin\/bible-course(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/admin\/featured-course(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/api\/admin\/alpha-events(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/api\/admin\/events(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/api\/admin\/featured-course(\/|$)/, roles: ["event_admin"] },

  // Event admin — announcements, except the sitewide banner
  { pattern: /^\/admin\/popup(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/admin\/featured-event(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/admin\/event-popup(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/admin\/nfc(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/api\/admin\/popup(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/api\/admin\/featured-event(\/|$)/, roles: ["event_admin"] },
  { pattern: /^\/api\/admin\/nfc(\/|$)/, roles: ["event_admin"] },

  // Store
  { pattern: /^\/admin\/store(\/|$)/, roles: ["store_admin"] },
  { pattern: /^\/api\/admin\/store(\/|$)/, roles: ["store_admin"] },
  { pattern: /^\/api\/admin\/shop-hero(\/|$)/, roles: ["store_admin"] },

  // Site admin — posts, redirects
  { pattern: /^\/admin\/posts(\/|$)/, roles: ["site_admin"] },
  { pattern: /^\/admin\/redirects(\/|$)/, roles: ["site_admin"] },
  { pattern: /^\/api\/admin\/posts(\/|$)/, roles: ["site_admin"] },
  { pattern: /^\/api\/admin\/redirects(\/|$)/, roles: ["site_admin"] },
];

// Paths any authenticated admin can reach regardless of role.
const OPEN_PATHS = [/^\/admin$/, /^\/api\/admin\/logout$/, /^\/api\/admin\/me\/roles$/];

export function hasAccess(roles: RoleFlags, pathname: string): boolean {
  if (roles.super_admin) return true;
  if (OPEN_PATHS.some((p) => p.test(pathname))) return true;
  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) return true;

  const rule = ROUTE_RULES.find((r) => r.pattern.test(pathname));
  if (!rule) return false; // fail closed: unmapped admin routes are super-admin only
  return rule.roles.some((role) => roles[role]);
}

export async function getRoles(
  supabase: ServiceClient,
  authUserId: string,
): Promise<RoleFlags> {
  const { data } = await supabase
    .from("admin_roles")
    .select("training_admin, event_admin, store_admin, site_admin, super_admin")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!data) return NO_ROLES;
  return {
    training_admin: Boolean(data.training_admin),
    event_admin: Boolean(data.event_admin),
    store_admin: Boolean(data.store_admin),
    site_admin: Boolean(data.site_admin),
    super_admin: Boolean(data.super_admin),
  };
}
