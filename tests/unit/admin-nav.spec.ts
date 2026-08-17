import { test, expect } from "@playwright/test";
import {
  ADMIN_GROUPS,
  ADMIN_NAV_ITEMS,
  ADMIN_QUICK_ACTIONS,
  breadcrumbsFor,
  itemForPath,
  titleForPath,
  visibleGroups,
  visibleItems,
  visibleQuickActions,
} from "../../lib/adminNav";
import { ADMIN_ROLES, NO_ROLES, hasAccess, type RoleFlags } from "../../lib/adminRoles";

/**
 * lib/adminNav is the single list the sidebar, header breadcrumbs, dashboard
 * grid and ⌘K palette all render from. Two classes of bug matter here:
 *
 *  1. Drift from lib/adminRoles — a section shown to someone who can't open it
 *     sends them to a "you don't have access" bounce, which is worse than not
 *     showing it. The role each entry declares must be a role that actually
 *     grants that path.
 *  2. Breadcrumbs that dead-end. Every non-final crumb has to be a real,
 *     clickable path, or the header stops being a way back out.
 */

const roles = (...granted: (keyof RoleFlags)[]): RoleFlags => ({
  ...NO_ROLES,
  ...Object.fromEntries(granted.map((r) => [r, true])),
});

/* ── Registry integrity ──────────────────────────────────────────────────── */

test("every nav href is unique", () => {
  const hrefs = ADMIN_NAV_ITEMS.map((i) => i.href);
  expect(new Set(hrefs).size).toBe(hrefs.length);
});

test("every nav entry has a description for the dashboard card", () => {
  for (const item of ADMIN_NAV_ITEMS) {
    expect(item.description, `${item.href} needs a description`).toBeTruthy();
  }
});

test("every declared role is a real admin role", () => {
  for (const item of ADMIN_NAV_ITEMS) {
    if (item.role === null) continue;
    expect(ADMIN_ROLES, `${item.href}`).toContain(item.role);
  }
  for (const action of ADMIN_QUICK_ACTIONS) {
    if (action.role === null) continue;
    expect(ADMIN_ROLES, `${action.id}`).toContain(action.role);
  }
});

test("the role each entry declares actually grants access to its path", () => {
  // This is the drift guard: if ROUTE_RULES changes and this file doesn't, a
  // user gets shown a link that bounces them straight back to the dashboard.
  for (const item of ADMIN_NAV_ITEMS) {
    const granted = item.role === null ? NO_ROLES : roles(item.role);
    expect(hasAccess(granted, item.href), `${item.href} via ${item.role}`).toBe(true);
  }
});

test("quick actions point at paths their role can reach", () => {
  for (const action of ADMIN_QUICK_ACTIONS) {
    if (action.external) continue;
    const path = action.href.split("?")[0];
    const granted = action.role === null ? NO_ROLES : roles(action.role);
    expect(hasAccess(granted, path), `${action.id} → ${path}`).toBe(true);
  }
});

/* ── Role filtering ──────────────────────────────────────────────────────── */

test("a user with no roles sees only the dashboard", () => {
  const items = visibleItems(NO_ROLES);
  expect(items.map((i) => i.href)).toEqual(["/admin"]);
});

test("a store admin sees the store and nothing else", () => {
  const items = visibleItems(roles("store_admin"));
  const hrefs = items.map((i) => i.href);
  expect(hrefs).toContain("/admin/store");
  expect(hrefs).toContain("/admin/store/orders");
  expect(hrefs).not.toContain("/admin/posts");
  expect(hrefs).not.toContain("/admin/users");
  expect(hrefs).not.toContain("/admin/banner");
});

test("a super admin sees every listed section", () => {
  const listed = ADMIN_NAV_ITEMS.filter((i) => !i.unlisted);
  expect(visibleItems(roles("super_admin"))).toHaveLength(listed.length);
});

test("HR stays out of the nav until it is asked for explicitly", () => {
  // HR is built but unlaunched; it must not appear in the sidebar, the
  // dashboard grid, or the palette.
  const hrefs = visibleItems(roles("super_admin")).map((i) => i.href);
  expect(hrefs.some((h) => h.startsWith("/admin/hr"))).toBe(false);

  const withUnlisted = visibleItems(roles("super_admin"), { includeUnlisted: true });
  expect(withUnlisted.some((i) => i.href === "/admin/hr")).toBe(true);
});

test("groups left empty by role filtering are dropped, not rendered blank", () => {
  const groups = visibleGroups(roles("store_admin"));
  expect(groups.every((g) => g.items.length > 0)).toBe(true);
  expect(groups.map((g) => g.label)).not.toContain("Courses");
});

test("quick actions are filtered the same way", () => {
  const ids = visibleQuickActions(roles("site_admin")).map((a) => a.id);
  expect(ids).toContain("new-post");
  expect(ids).toContain("view-site"); // role: null — everyone gets this one
  expect(ids).not.toContain("new-product");
  expect(ids).not.toContain("clear-cache");
});

/* ── Path resolution ─────────────────────────────────────────────────────── */

test("the longest matching href wins", () => {
  // /admin/store is a prefix of /admin/store/orders; the deeper one must win.
  expect(itemForPath("/admin/store/orders")?.label).toBe("Orders");
  expect(itemForPath("/admin/store/orders/abc-123")?.label).toBe("Orders");
  expect(itemForPath("/admin/store/products/abc-123")?.label).toBe("Products");
});

test("the dashboard matches exactly and never by prefix", () => {
  expect(itemForPath("/admin")?.label).toBe("Dashboard");
  // /admin/redirects must not resolve to Dashboard just because /admin is a
  // prefix of it.
  expect(itemForPath("/admin/redirects")?.label).toBe("Redirects");
});

test("an unmapped path still gets a readable title", () => {
  expect(titleForPath("/admin/some-new-thing")).toBe("Some New Thing");
});

/* ── Breadcrumbs ─────────────────────────────────────────────────────────── */

test("the dashboard is a single crumb with no link", () => {
  expect(breadcrumbsFor("/admin")).toEqual([{ label: "Dashboard" }]);
});

test("a section page climbs back to the dashboard", () => {
  const crumbs = breadcrumbsFor("/admin/posts");
  expect(crumbs.map((c) => c.label)).toEqual(["Dashboard", "Posts"]);
  expect(crumbs[0].href).toBe("/admin");
  expect(crumbs[1].href).toBeUndefined(); // current page isn't a link
});

test("a deep page shows every level above it", () => {
  const crumbs = breadcrumbsFor("/admin/store/orders/9f8e7d6c5b4a3210");
  expect(crumbs.map((c) => c.label)).toEqual([
    "Dashboard",
    "Products",
    "Orders",
    "Details",
  ]);
  expect(crumbs[1].href).toBe("/admin/store");
  expect(crumbs[2].href).toBe("/admin/store/orders");
});

test("a named leaf keeps its name instead of becoming Details", () => {
  const crumbs = breadcrumbsFor("/admin/store/products/new");
  expect(crumbs[crumbs.length - 1].label).toBe("New");
});

test("every non-final crumb links somewhere real", () => {
  const paths = [
    "/admin/posts",
    "/admin/store/orders/abc123",
    "/admin/store/products/new",
    "/admin/training/cat-1/sub-2",
    "/admin/hr/staff/abc123",
    "/admin/unmapped-page",
  ];
  for (const path of paths) {
    const crumbs = breadcrumbsFor(path);
    for (const crumb of crumbs.slice(0, -1)) {
      expect(crumb.href, `${path} → "${crumb.label}"`).toBeTruthy();
      expect(crumb.label).toBeTruthy();
    }
  }
});

test("no group is declared without items", () => {
  for (const group of ADMIN_GROUPS) {
    expect(group.items.length, `${group.label}`).toBeGreaterThan(0);
    // Anything grouped under a label needs an icon for the sidebar dropdown.
    if (group.label !== null) expect(group.icon, `${group.label}`).toBeTruthy();
  }
});
