import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * `/api/live-control/*` hangs off the public /live page, so middleware.ts does
 * NOT cover it — its matcher is /admin/* and /api/admin/* (see the comment at
 * the top of lib/liveChatAuth.ts). Every handler there has to authorise itself,
 * and the failure mode if one doesn't is silent: the route works perfectly in
 * testing, because whoever is testing it is signed in.
 *
 * So this reads the source. It is a lint rule in the shape of a test, and it
 * exists because the next person to add a handler to that folder will not read
 * the comment.
 */

const ROUTE_DIR = join(__dirname, "../../app/api/live-control");
const HANDLERS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return entry === "route.ts" ? [full] : [];
  });
}

const files = routeFiles(ROUTE_DIR);

test("there are live-control routes to check", () => {
  // Guards the guard: a rename that empties this list must fail loudly rather
  // than turning every assertion below into a vacuous pass.
  expect(files.length).toBeGreaterThan(0);
});

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const name = file.slice(file.indexOf("app/api/live-control"));

  test(`${name} imports requireHost`, () => {
    expect(source).toContain("requireHost");
    expect(source).toContain("@/lib/liveChatAuth");
  });

  for (const method of HANDLERS) {
    const declaration = `export async function ${method}(`;
    if (!source.includes(declaration)) continue;

    test(`${name} — ${method} calls requireHost before anything else`, () => {
      const body = source.slice(source.indexOf(declaration));
      const authAt = body.indexOf("await requireHost()");
      expect(authAt, `${method} must call requireHost()`).toBeGreaterThan(-1);

      // Nothing that touches the caller's input or the database may appear
      // before the check. Reading a body before establishing who is asking is
      // the specific bug this is here to catch.
      for (const forbidden of ["request.json()", "request.url", "SimulatedLive("]) {
        const at = body.indexOf(forbidden);
        if (at === -1) continue;
        expect(
          at,
          `${method} touches ${forbidden} before requireHost()`
        ).toBeGreaterThan(authAt);
      }
    });
  }
}
