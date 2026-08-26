import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { AUDIT_ACTION_KEYS, AUDIT_SECTION_KEYS } from "../../lib/audit";

/**
 * The audit log is only worth having if it has no holes in it.
 *
 * A log that records nine changes out of ten is worse than none: it teaches
 * people to trust an answer that is silently missing the change they were
 * looking for. Nothing in the code stops someone adding a route that writes to
 * the database and forgetting to call recordAudit() — so this test does.
 *
 * Every handler under /api/admin that can change something (POST, PUT, PATCH,
 * DELETE) must either call recordAudit() or carry an `audit-exempt:` comment
 * saying why not. The exemption is deliberately a comment rather than a config
 * list: it sits where the next person will read it, and writing the sentence is
 * enough friction to make "I'll skip this one" a decision instead of a slip.
 */

const ADMIN_API = join(process.cwd(), "app", "api", "admin");
const MUTATING = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/;

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...routeFiles(path));
    else if (entry === "route.ts") out.push(path);
  }
  return out;
}

const files = routeFiles(ADMIN_API).map((path) => ({
  path,
  relative: path.slice(process.cwd().length + 1),
  source: readFileSync(path, "utf8"),
}));

const mutating = files.filter((file) => MUTATING.test(file.source));

test("there are admin routes to check (the walker still finds them)", () => {
  // Guards against this whole file quietly passing because the directory moved.
  expect(mutating.length).toBeGreaterThan(30);
});

test("every mutating admin route records what it did", () => {
  const missing = mutating
    .filter(
      (file) =>
        !file.source.includes("recordAudit(") && !file.source.includes("audit-exempt:"),
    )
    .map((file) => file.relative);

  expect(
    missing,
    `These routes change something without recording it. Call recordAudit() from lib/audit.server.ts, or add an "audit-exempt: <why>" comment:\n${missing.join("\n")}`,
  ).toEqual([]);
});

test("every exemption says why", () => {
  for (const file of mutating) {
    const match = file.source.match(/audit-exempt:(.*)/);
    if (!match) continue;
    expect(
      match[1].trim().length,
      `${file.relative} is audit-exempt but doesn't say why`,
    ).toBeGreaterThan(20);
  }
});

/**
 * Sections and actions are closed sets so the filter chips can be built from
 * them. A typo'd section would file entries under a heading the page never
 * offers, making them invisible to everything except a raw search.
 */
test("every recorded section and action is one the page knows about", () => {
  const auditing = files.filter((file) => file.source.includes("recordAudit("));

  for (const file of auditing) {
    for (const [, section] of file.source.matchAll(/\bsection:\s*"([a-z_]+)"/g)) {
      expect(
        AUDIT_SECTION_KEYS,
        `${file.relative} logs an unknown section "${section}"`,
      ).toContain(section);
    }
    for (const [, action] of file.source.matchAll(/\baction:\s*"([a-z_]+)"/g)) {
      expect(
        AUDIT_ACTION_KEYS,
        `${file.relative} logs an unknown action "${action}"`,
      ).toContain(action);
    }
  }
});

/**
 * Sign-in and sign-out happen outside /api/admin, and they are the entries a
 * Super Admin looks for first when something is wrong. They have been forgotten
 * before in codebases that audited everything else, so they are pinned here.
 */
test("signing in and out is recorded", () => {
  const loginActions = readFileSync(join(process.cwd(), "app", "login", "actions.ts"), "utf8");
  expect(loginActions).toContain("recordAudit(");
  expect(loginActions).toContain('action: "login"');
  expect(loginActions).toContain('action: "logout"');

  const logoutRoute = readFileSync(
    join(process.cwd(), "app", "api", "admin", "logout", "route.ts"),
    "utf8",
  );
  expect(logoutRoute).toContain("recordAudit(");
});

/**
 * recordAudit reads the actor from headers middleware sets. If middleware ever
 * stops setting them, every entry silently loses its "who" — the one column the
 * whole feature exists for — while everything still appears to work.
 */
test("middleware forwards who the actor is", () => {
  const middleware = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
  expect(middleware).toContain("AUDIT_ACTOR_HEADERS");
  expect(middleware).toContain("withActorHeaders(");
});
