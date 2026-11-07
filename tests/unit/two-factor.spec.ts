import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BACKUP_CODE_COUNT,
  generateBackupCode,
  hashBackupCode,
  looksLikeBackupCode,
  normaliseBackupCode,
} from "../../lib/backupCodes";
import { assuranceLevelOf, backupCodesFile, hasAuthenticator, safeNextPath } from "../../lib/twoFactor";
import { NO_ROLES, hasAccess, type RoleFlags } from "../../lib/adminRoles";

/**
 * Two-factor sign-in for admins (lib/twoFactor.ts). The pieces that decide
 * whether a session is let into the admin, and the backup codes.
 */

const only = (...granted: (keyof RoleFlags)[]): RoleFlags => ({
  ...NO_ROLES,
  ...Object.fromEntries(granted.map((r) => [r, true])),
});

/** A JWT-shaped string with this payload. The signature is never checked here. */
function token(payload: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256" })}.${b64(payload)}.sig`;
}

/* ── Assurance level ───────────────────────────────────────────────────────── */

test("reads the assurance level a token was issued at", () => {
  expect(assuranceLevelOf(token({ aal: "aal2" }))).toBe("aal2");
  expect(assuranceLevelOf(token({ aal: "aal1" }))).toBe("aal1");
});

test("anything that isn't a clear aal1/aal2 reads as no level, so middleware refuses it", () => {
  expect(assuranceLevelOf(null)).toBeNull();
  expect(assuranceLevelOf("")).toBeNull();
  expect(assuranceLevelOf("not-a-jwt")).toBeNull();
  expect(assuranceLevelOf("a.%%%.c")).toBeNull();
  expect(assuranceLevelOf(token({}))).toBeNull();
  expect(assuranceLevelOf(token({ aal: "aal3" }))).toBeNull();
  expect(assuranceLevelOf(token({ aal: true }))).toBeNull();
});

test("only a confirmed authenticator app counts as set up", () => {
  const factor = (status: string, factor_type = "totp") => ({ id: "f", status, factor_type });
  expect(hasAuthenticator({ factors: [factor("verified")] } as never)).toBe(true);
  expect(hasAuthenticator({ factors: [factor("unverified")] } as never)).toBe(false);
  expect(hasAuthenticator({ factors: [factor("verified", "phone")] } as never)).toBe(false);
  expect(hasAuthenticator({ factors: [] } as never)).toBe(false);
  expect(hasAuthenticator(null)).toBe(false);
});

/* ── Where /login/2fa may send you ─────────────────────────────────────────── */

test("next= only ever goes into the admin or back to the chooser", () => {
  expect(safeNextPath("/admin")).toBe("/admin");
  expect(safeNextPath("/admin/hr/staff")).toBe("/admin/hr/staff");
  expect(safeNextPath("/login")).toBe("/login");
  expect(safeNextPath("/admin/reset-password")).toBe("/admin/reset-password");
});

test("next= can't be turned into an open redirect", () => {
  for (const bad of [
    null,
    undefined,
    "",
    "https://evil.example/admin",
    "//evil.example/admin",
    "/\\evil.example",
    "/admin\\..\\x",
    "javascript:alert(1)",
    "/shop",
    "/administrator",
  ]) {
    expect(safeNextPath(bad), String(bad)).toBe("/admin");
  }
});

/* ── Backup codes ──────────────────────────────────────────────────────────── */

test("backup codes look like XXXX-XXXX-XXXX-XXXX and avoid confusable characters", () => {
  for (let i = 0; i < 200; i++) {
    const code = generateBackupCode();
    expect(code).toMatch(/^[2-9A-HJKMNP-Z]{4}(-[2-9A-HJKMNP-Z]{4}){3}$/);
    expect(looksLikeBackupCode(code)).toBe(true);
  }
});

test("backup codes don't repeat", () => {
  const codes = new Set(Array.from({ length: 2000 }, generateBackupCode));
  expect(codes.size).toBe(2000);
  expect(BACKUP_CODE_COUNT).toBe(8);
});

test("a code matches however it's typed: case, spaces and dashes don't matter", () => {
  const code = "ABCD-EFGH-JKMN-PQRS";
  const hash = hashBackupCode(code);
  expect(hashBackupCode("abcd-efgh-jkmn-pqrs")).toBe(hash);
  expect(hashBackupCode("ABCDEFGHJKMNPQRS")).toBe(hash);
  expect(hashBackupCode(" abcd efgh jkmn pqrs ")).toBe(hash);
  expect(normaliseBackupCode("ab-cd ef")).toBe("ABCDEF");
});

test("the stored hash isn't the code, and different codes hash differently", () => {
  const code = generateBackupCode();
  const hash = hashBackupCode(code);
  expect(hash).toMatch(/^[0-9a-f]{64}$/);
  expect(hash).not.toContain(normaliseBackupCode(code));
  expect(hashBackupCode(generateBackupCode())).not.toBe(hash);
});

test("junk is rejected before it reaches the database", () => {
  expect(looksLikeBackupCode("")).toBe(false);
  expect(looksLikeBackupCode("123456")).toBe(false);
  expect(looksLikeBackupCode("ABCD-EFGH-JKMN-PQR")).toBe(false);
  expect(looksLikeBackupCode("ABCD-EFGH-JKMN-PQRSX")).toBe(false);
  expect(looksLikeBackupCode("OOOO-IIII-LLLL-0000")).toBe(false);
});

test("the download names the account and holds every code", () => {
  const codes = Array.from({ length: 8 }, generateBackupCode);
  const file = backupCodesFile(codes, "admin@example.org");
  expect(file).toContain("admin@example.org");
  for (const c of codes) expect(file).toContain(c);
});

/* ── Who can reach the two-factor routes ───────────────────────────────────── */

test("every admin can reach their own two-factor settings", () => {
  for (const role of ["store_admin", "hr_admin", "event_admin"] as const) {
    expect(hasAccess(only(role), "/api/admin/me/two-factor")).toBe(true);
  }
});

test("only a Super Admin can reset someone else's two-factor sign-in", () => {
  const path = "/api/admin/users/00000000-0000-0000-0000-000000000001/two-factor";
  expect(hasAccess(only("super_admin"), path)).toBe(true);
  for (const role of ["hr_admin", "site_admin", "destiny_one_admin", "safeguarding_admin"] as const) {
    expect(hasAccess(only(role), path)).toBe(false);
  }
});

/**
 * The gate itself lives in middleware.ts, which can't run here. These guard
 * the two mistakes that would quietly switch it off: the check moving after
 * the role check (so a password-only session learns what it may open), and
 * the bearer path (D1 Admin desktop) slipping past it.
 */
test("middleware checks two-factor for admins before anything else answers", () => {
  const source = readFileSync(join(process.cwd(), "middleware.ts"), "utf8");
  const gate = source.indexOf('assuranceLevelOf(accessToken) !== "aal2"');
  const access = source.indexOf("if (!hasAccess(roles, pathname))");
  const actor = source.indexOf("return withActorHeaders(");
  expect(gate, "the aal2 check is gone from middleware.ts").toBeGreaterThan(-1);
  expect(gate).toBeLessThan(access);
  expect(gate).toBeLessThan(actor);
  expect(source).toMatch(/const accessToken =\s*bearerToken \?\?/);
});

test("the two-factor routes outside /api/admin check the caller themselves", () => {
  for (const route of ["enroll", "verify", "recover"]) {
    const source = readFileSync(join(process.cwd(), "app", "api", "auth", "mfa", route, "route.ts"), "utf8");
    expect(source, `${route} must start from signedInAdmin()`).toContain("await signedInAdmin()");
    expect(source).toMatch(/if \(!admin\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\)/);
  }
});
