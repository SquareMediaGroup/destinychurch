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
  | "host"
  | "hr_admin"
  | "media_admin"
  | "super_admin";

export const ADMIN_ROLES: AdminRole[] = [
  "training_admin",
  "event_admin",
  "store_admin",
  "site_admin",
  "host",
  "hr_admin",
  "media_admin",
  "super_admin",
];

/**
 * What each access level is called in front of a person.
 *
 * Lives here rather than in the page that happened to need it first, because
 * `store_admin` is a column name and should never reach a screen: the users
 * page, the audit log's summaries and its detail panel all have to call it the
 * same thing, and three copies of this map would eventually not.
 */
export const ROLE_LABELS: Record<AdminRole, string> = {
  training_admin: "Training Admin",
  event_admin: "Event Admin",
  store_admin: "Store Admin",
  site_admin: "Site Admin",
  host: "Host",
  hr_admin: "HR Admin",
  media_admin: "Media Admin",
  super_admin: "Super Admin",
};

/** One role, named. Falls back to the raw value if a stored role is retired. */
export function roleLabel(role: string): string {
  return ROLE_LABELS[role as AdminRole] ?? role.replace(/_/g, " ");
}

/** "Event Admin, Store Admin and Site Admin" — a list a sentence can contain. */
export function roleList(roles: readonly string[]): string {
  const labels = roles.map(roleLabel);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export type RoleFlags = Record<AdminRole, boolean>;

export const NO_ROLES: RoleFlags = {
  training_admin: false,
  event_admin: false,
  store_admin: false,
  site_admin: false,
  host: false,
  hr_admin: false,
  media_admin: false,
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
  { pattern: /^\/admin\/cap-money(\/|$)/, roles: ["event_admin"] },
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

  // Site admin — posts, redirects, analytics
  { pattern: /^\/admin\/posts(\/|$)/, roles: ["site_admin"] },
  { pattern: /^\/admin\/redirects(\/|$)/, roles: ["site_admin"] },
  { pattern: /^\/admin\/analytics(\/|$)/, roles: ["site_admin"] },
  { pattern: /^\/api\/admin\/posts(\/|$)/, roles: ["site_admin"] },
  { pattern: /^\/api\/admin\/redirects(\/|$)/, roles: ["site_admin"] },
  { pattern: /^\/api\/admin\/analytics(\/|$)/, roles: ["site_admin"] },

  // Host — the live chat console. Hosts also moderate from /live itself, which
  // is a public page and so sits outside this table; those routes authorise
  // themselves via lib/liveChatAuth.ts.
  { pattern: /^\/admin\/live-chat(\/|$)/, roles: ["host"] },
  { pattern: /^\/api\/admin\/live-chat(\/|$)/, roles: ["host"] },

  // Host — simulated live. Same people, same Sunday: whoever is running the
  // room is who starts the broadcast. Note these patterns require a `/` or the
  // end of the string after "live", so they can't swallow /admin/live-chat.
  { pattern: /^\/admin\/live(\/|$)/, roles: ["host"] },
  { pattern: /^\/api\/admin\/simulated-live(\/|$)/, roles: ["host"] },

  // HR — staff directory, leave, jobs, applications, documents, reviews
  { pattern: /^\/admin\/hr(\/|$)/, roles: ["hr_admin"] },
  { pattern: /^\/api\/admin\/hr(\/|$)/, roles: ["hr_admin"] },

  // Media Team — the /media gallery: boards, moderation queue
  { pattern: /^\/admin\/media(\/|$)/, roles: ["media_admin"] },
  { pattern: /^\/api\/admin\/media(\/|$)/, roles: ["media_admin"] },
];

// Paths any authenticated admin can reach regardless of role.
//
// /api/admin/search is open because every admin needs the ⌘K palette, but it
// is *not* unguarded: the route re-reads the caller's roles and only queries
// the sections they can open, so a Store Admin's results contain orders and
// products and nothing else. See app/api/admin/search/route.ts.
//
// /api/admin/me only ever returns the caller's own email and role flags.
const OPEN_PATHS = [
  /^\/admin$/,
  /^\/api\/admin\/logout$/,
  /^\/api\/admin\/me$/,
  /^\/api\/admin\/me\/roles$/,
  /^\/api\/admin\/search$/,
  // Everyone's own onboarding progress — the route only ever reads and writes
  // the caller's row, keyed off their cookie session.
  /^\/api\/admin\/onboarding$/,
];

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
  // The column list is spelled out rather than `*` so a new access level has to
  // be added here deliberately — but that also means forgetting this line makes
  // the new role silently read as false everywhere. Keep it in step with
  // AdminRole above.
  const { data } = await supabase
    .from("admin_roles")
    .select(
      "training_admin, event_admin, store_admin, site_admin, host, hr_admin, media_admin, super_admin",
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (!data) return NO_ROLES;
  return {
    training_admin: Boolean(data.training_admin),
    event_admin: Boolean(data.event_admin),
    store_admin: Boolean(data.store_admin),
    site_admin: Boolean(data.site_admin),
    host: Boolean(data.host),
    hr_admin: Boolean(data.hr_admin),
    media_admin: Boolean(data.media_admin),
    super_admin: Boolean(data.super_admin),
  };
}
