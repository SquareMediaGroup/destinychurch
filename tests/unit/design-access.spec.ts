import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_ROLES, NO_ROLES, hasAccess, type RoleFlags } from "../../lib/adminRoles";

/**
 * The two failure modes in this module that nothing else would catch, plus the
 * access rules for the design queue.
 */

const only = (...granted: (keyof RoleFlags)[]): RoleFlags => ({
  ...NO_ROLES,
  ...Object.fromEntries(granted.map((r) => [r, true])),
});

/* ── The silent one ────────────────────────────────────────────────────────── */

/**
 * getRoles spells its column list out by hand rather than selecting *, so that
 * adding an access level is a deliberate act. The cost is that forgetting that
 * one line makes the new role read as false for everyone, everywhere, with no
 * error and nothing in the UI to explain why the section never appears.
 *
 * It has no other guard. This is it.
 */
test("every admin role is actually read from the database", () => {
  const source = readFileSync(join(process.cwd(), "lib", "adminRoles.ts"), "utf8");

  const select = source.match(/\.select\(\s*"([^"]+)"/);
  expect(select, "getRoles no longer has a literal .select() to check").toBeTruthy();
  const columns = select![1].split(",").map((c) => c.trim());

  for (const role of ADMIN_ROLES) {
    expect(
      columns,
      `${role} is missing from getRoles' select — it will silently read as false for everyone`,
    ).toContain(role);
  }
});

/* ── The expensive one ─────────────────────────────────────────────────────── */

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...routeFiles(path));
    else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) out.push(path);
  }
  return out;
}

/**
 * Playbook permalinks are permanent, unsigned URLs capped by plan (Pro = 1,000
 * for this org). Design deliverables never need one: every download goes
 * through a route that mints a fresh signed URL for someone who has already
 * proved they can see the ticket.
 *
 * The risk is copy-paste. The pattern `ensurePermalink(asset.token)` looks
 * exactly like the right thing to reach for, and spending the cap is silent
 * until the day it runs out.
 */
test("the design ticket module never spends a Playbook permalink", () => {
  const dirs = [
    join(process.cwd(), "app", "api", "admin", "design"),
    join(process.cwd(), "app", "api", "design-request"),
    join(process.cwd(), "app", "api", "portal", "design"),
  ];

  const offenders: string[] = [];
  for (const dir of dirs) {
    for (const path of routeFiles(dir)) {
      if (/[Pp]ermalink/.test(readFileSync(path, "utf8"))) {
        offenders.push(path.slice(process.cwd().length + 1));
      }
    }
  }

  expect(
    offenders,
    `These reach for a permalink. Use getTemporaryDisplayUrl() instead — a signed URL per download costs nothing:\n${offenders.join("\n")}`,
  ).toEqual([]);
});

test("lib/playbook.server.ts does not export a way to spend one", () => {
  // Trimmed on restore precisely so the temptation isn't in reach.
  const source = readFileSync(join(process.cwd(), "lib", "playbook.server.ts"), "utf8");
  expect(source).not.toMatch(/export async function (request|ensure)Permalink/);
});

/* ── Access ────────────────────────────────────────────────────────────────── */

test("a design admin reaches the queue and its API", () => {
  const designer = only("design_admin");
  expect(hasAccess(designer, "/admin/design")).toBe(true);
  expect(hasAccess(designer, "/admin/design/some-ticket-id")).toBe(true);
  expect(hasAccess(designer, "/api/admin/design/tickets")).toBe(true);
  expect(hasAccess(designer, "/api/admin/design/tickets/abc/status")).toBe(true);
});

test("a design admin reaches nothing else in the admin", () => {
  const designer = only("design_admin");
  for (const path of [
    "/admin/users",
    "/admin/hr",
    "/admin/store",
    "/admin/posts",
    "/api/admin/hr/staff",
    "/api/admin/users",
  ]) {
    expect(hasAccess(designer, path), path).toBe(false);
  }
});

test("other roles do not reach the design queue", () => {
  for (const role of ["training_admin", "event_admin", "store_admin", "site_admin", "hr_admin", "host"] as const) {
    expect(hasAccess(only(role), "/admin/design"), role).toBe(false);
    expect(hasAccess(only(role), "/api/admin/design/tickets"), role).toBe(false);
  }
});

test("a super admin still reaches it", () => {
  expect(hasAccess(only("super_admin"), "/admin/design")).toBe(true);
});

/**
 * The requester's surfaces are reached by share token, not by a session, so
 * middleware must not be guarding them — a token link that redirects to /login
 * is a broken link for everyone who isn't staff.
 */
test("the requester's own pages are outside the admin guard", () => {
  for (const path of [
    "/design-request",
    "/design-request/0123456789abcdef0123456789abcdef",
    "/api/design-request/0123456789abcdef0123456789abcdef",
  ]) {
    expect(hasAccess(NO_ROLES, path), path).toBe(true);
  }
});
