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

/* ── The host role ─────────────────────────────────────────────────────────── */

test("a host reaches the live chat console and its API", () => {
  const host = only("host");
  expect(hasAccess(host, "/admin/live-chat")).toBe(true);
  expect(hasAccess(host, "/admin/live-chat/anything")).toBe(true);
  expect(hasAccess(host, "/api/admin/live-chat/moderate")).toBe(true);
  expect(hasAccess(host, "/api/admin/live-chat/session")).toBe(true);
});

test("a host reaches nothing else in the admin", () => {
  const host = only("host");
  for (const path of [
    "/admin/users",
    "/admin/banner",
    "/admin/store",
    "/admin/posts",
    "/admin/training",
    "/api/admin/users",
    "/api/admin/posts",
  ]) {
    expect(hasAccess(host, path), path).toBe(false);
  }
});

test("other roles do not reach the live chat console", () => {
  for (const role of ["training_admin", "event_admin", "store_admin", "site_admin"] as const) {
    expect(hasAccess(only(role), "/admin/live-chat"), role).toBe(false);
    expect(hasAccess(only(role), "/api/admin/live-chat/moderate"), role).toBe(false);
  }
});

test("a super admin reaches the live chat console without holding the host role", () => {
  const su = only("super_admin");
  expect(su.host).toBe(false);
  expect(hasAccess(su, "/admin/live-chat")).toBe(true);
  expect(hasAccess(su, "/api/admin/live-chat/moderate")).toBe(true);
});

/* ── Fail-closed behaviour ─────────────────────────────────────────────────── */

test("an unmapped admin route stays super-admin only", () => {
  // The guarantee that makes a forgotten ROUTE_RULES entry safe rather than open.
  expect(hasAccess(only("host"), "/admin/something-new")).toBe(false);
  expect(hasAccess(only("site_admin"), "/api/admin/something-new")).toBe(false);
  expect(hasAccess(only("super_admin"), "/admin/something-new")).toBe(true);
});

test("a user with no roles reaches only the shared paths", () => {
  expect(hasAccess(NO_ROLES, "/admin")).toBe(true);
  expect(hasAccess(NO_ROLES, "/api/admin/logout")).toBe(true);
  expect(hasAccess(NO_ROLES, "/admin/live-chat")).toBe(false);
  expect(hasAccess(NO_ROLES, "/admin/users")).toBe(false);
});

test("public paths are not the role system's business", () => {
  // /live is public and unmatched by middleware; the chat routes there authorise
  // themselves via lib/liveChatAuth.ts instead.
  expect(hasAccess(NO_ROLES, "/live")).toBe(true);
  expect(hasAccess(NO_ROLES, "/api/live-chat/messages")).toBe(true);
});
