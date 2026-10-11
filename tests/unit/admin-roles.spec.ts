import { test, expect } from "@playwright/test";
import {
  ADMIN_ROLES,
  NO_ROLES,
  hasAccess,
  type AdminRole,
  type RoleFlags,
} from "../../lib/adminRoles";

/**
 * The access-level system is wired through several files that must agree, and
 * the failure mode is silent: a role missing from one of them doesn't throw, it
 * just quietly grants nothing. These check the parts that have no other guard.
 */

const only = (...roles: AdminRole[]): RoleFlags => ({
  ...NO_ROLES,
  ...Object.fromEntries(roles.map((r) => [r, true])),
});

test("ADMIN_ROLES and NO_ROLES describe the same set of roles", () => {
  // NO_ROLES is Record<AdminRole, boolean>, so a role added to the union without
  // being added here won't compile — but the reverse (a stale extra key) would.
  expect(new Set(Object.keys(NO_ROLES))).toEqual(new Set(ADMIN_ROLES));
});

test("every role is spelled the same everywhere it appears", () => {
  for (const role of ADMIN_ROLES) {
    expect(NO_ROLES, role).toHaveProperty(role);
    expect(NO_ROLES[role], role).toBe(false);
  }
});

/* ── Fail-closed behaviour ─────────────────────────────────────────────────── */

test("an unmapped admin route stays super-admin only", () => {
  // The guarantee that makes a forgotten ROUTE_RULES entry safe rather than open.
  expect(hasAccess(only("event_admin"), "/admin/something-new")).toBe(false);
  expect(hasAccess(only("site_admin"), "/api/admin/something-new")).toBe(false);
  expect(hasAccess(only("super_admin"), "/admin/something-new")).toBe(true);
});

test("a user with no roles reaches only the shared paths", () => {
  expect(hasAccess(NO_ROLES, "/admin")).toBe(true);
  expect(hasAccess(NO_ROLES, "/api/admin/logout")).toBe(true);
  expect(hasAccess(NO_ROLES, "/admin/users")).toBe(false);
});

test("public paths are not the role system's business", () => {
  // Public pages are unmatched by middleware.
  expect(hasAccess(NO_ROLES, "/sermons")).toBe(true);
});

/* ── D1 Admin desktop app routes ──────────────────────────────────────────── */

test("the desktop app's whoami answers any signed-in user, and only describes them", () => {
  // A leader with no admin role must be able to ask, to be shown chat only.
  expect(hasAccess(NO_ROLES, "/api/admin/destiny-one/whoami")).toBe(true);
  // ...but the open rule is exact: it doesn't open anything under it.
  expect(hasAccess(NO_ROLES, "/api/admin/destiny-one/whoami/x")).toBe(false);
  expect(hasAccess(NO_ROLES, "/api/admin/destiny-one/members")).toBe(false);
});

test("restricting, escalating and the D1 audit feed are safeguarding only", () => {
  for (const path of [
    "/api/admin/destiny-one/safeguarding/members/abc/restrict",
    "/api/admin/destiny-one/safeguarding/reports/1/escalate",
    "/api/admin/destiny-one/safeguarding/audit",
  ]) {
    expect(hasAccess(only("safeguarding_admin"), path), path).toBe(true);
    expect(hasAccess(only("destiny_one_admin"), path), path).toBe(false);
  }
});
