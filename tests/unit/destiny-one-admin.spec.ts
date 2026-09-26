import { test, expect } from "@playwright/test";
import { adultOnFromDateOfBirth } from "../../packages/shared/src/destinyOne/policy";
import { ONBOARDING_MESSAGES, adultOnForDecision, onboardingState } from "../../lib/destinyOne/onboarding";
import { accessRequestSchema, invitesSchema } from "../../lib/destinyOne/schemas";
import { NO_ROLES, hasAccess, type RoleFlags } from "../../lib/adminRoles";

/**
 * Destiny One part 2: staff (not ChurchSuite) verify who someone is and how
 * old they are, and two admin roles split running the app from reading it.
 */

const roles = (...granted: (keyof RoleFlags)[]): RoleFlags => ({
  ...NO_ROLES,
  ...Object.fromEntries(granted.map((r) => [r, true])),
});

test.describe("onboardingState", () => {
  const open = { allowAccessRequests: true };
  const closed = { allowAccessRequests: false };

  test("no account yet: the request form, or invite-only when requests are off", () => {
    expect(onboardingState(null, open)).toBe("request_needed");
    expect(onboardingState(null, closed)).toBe("invite_only");
  });

  test("a submitted request waits, whatever the setting", () => {
    const m = { status: "pending" as const, request_submitted_at: "2026-09-27T10:00:00Z" };
    expect(onboardingState(m, open)).toBe("request_submitted");
    expect(onboardingState(m, closed)).toBe("request_submitted");
  });

  test("active is active; suspended and deleted are shut out", () => {
    expect(onboardingState({ status: "active", request_submitted_at: null }, closed)).toBe("active");
    expect(onboardingState({ status: "suspended", request_submitted_at: null }, open)).toBe("suspended");
    expect(onboardingState({ status: "deleted", request_submitted_at: null }, open)).toBe("suspended");
  });

  test("every non-active state has copy the app can show", () => {
    for (const message of Object.values(ONBOARDING_MESSAGES)) expect(message.length).toBeGreaterThan(10);
  });
});

test.describe("adultOnForDecision", () => {
  const today = "2026-09-27";
  const decide = (adult: boolean, dateOfBirth?: string) => adultOnForDecision({ adult, dateOfBirth }, today, adultOnFromDateOfBirth);

  test("an adult with no date of birth is an adult from today", () => {
    expect(decide(true)).toEqual({ ok: true, adultOn: today });
  });

  test("an under-18 with no date of birth stays a minor until someone changes it", () => {
    expect(decide(false)).toEqual({ ok: true, adultOn: null });
  });

  test("an under-18 with a date of birth becomes an adult on their 18th birthday", () => {
    expect(decide(false, "2012-03-04")).toEqual({ ok: true, adultOn: "2030-03-04" });
  });

  test("the choice and the date of birth must agree", () => {
    expect(decide(true, "2012-03-04")).toMatchObject({ ok: false });
    expect(decide(false, "1990-01-01")).toMatchObject({ ok: false });
  });

  test("turning 18 today counts as an adult", () => {
    expect(decide(true, "2008-09-27")).toEqual({ ok: true, adultOn: "2026-09-27" });
    expect(decide(false, "2008-09-27")).toMatchObject({ ok: false });
  });

  test("nonsense dates are refused, not guessed", () => {
    expect(decide(true, "2008-02-30")).toMatchObject({ ok: false });
  });
});

test.describe("request and invite validation", () => {
  test("an access request needs a real name; the date of birth is optional", () => {
    expect(accessRequestSchema.safeParse({ name: "A" }).success).toBe(false);
    expect(accessRequestSchema.safeParse({ name: "Sam Jones" }).success).toBe(true);
    expect(accessRequestSchema.safeParse({ name: "Sam Jones", dateOfBirth: "17/05/2008" }).success).toBe(false);
  });

  test("invites lower-case the email and default roles and communities to none", () => {
    const parsed = invitesSchema.parse({ invites: [{ email: " Jane@Example.org ", name: "Jane Smith", adult: true }] });
    expect(parsed.invites[0]).toMatchObject({ email: "jane@example.org", roles: [], communityIds: [] });
  });

  test("a bad email is refused, and so is an empty list", () => {
    expect(invitesSchema.safeParse({ invites: [{ email: "nope", name: "Jane Smith", adult: true }] }).success).toBe(false);
    expect(invitesSchema.safeParse({ invites: [] }).success).toBe(false);
  });
});

test.describe("the two Destiny One roles", () => {
  test("a Destiny One Admin runs the app but cannot reach safeguarding", () => {
    const d1 = roles("destiny_one_admin");
    for (const path of [
      "/admin/destiny-one",
      "/admin/destiny-one/requests",
      "/admin/destiny-one/communities/abc",
      "/api/admin/destiny-one/members/abc/approve",
      "/api/admin/destiny-one/invites",
    ]) {
      expect(hasAccess(d1, path), path).toBe(true);
    }
    for (const path of [
      "/admin/destiny-one/safeguarding",
      "/api/admin/destiny-one/safeguarding/groups/abc/transcript",
      "/api/admin/destiny-one/safeguarding/reports",
    ]) {
      expect(hasAccess(d1, path), path).toBe(false);
    }
  });

  test("a Safeguarding Admin reaches safeguarding and nothing else in Destiny One", () => {
    const sg = roles("safeguarding_admin");
    expect(hasAccess(sg, "/admin/destiny-one/safeguarding")).toBe(true);
    expect(hasAccess(sg, "/api/admin/destiny-one/safeguarding/groups/abc/transcript")).toBe(true);
    expect(hasAccess(sg, "/admin/destiny-one/members")).toBe(false);
    expect(hasAccess(sg, "/api/admin/destiny-one/invites")).toBe(false);
  });

  test("other admin roles reach neither", () => {
    const hr = roles("hr_admin");
    expect(hasAccess(hr, "/admin/destiny-one")).toBe(false);
    expect(hasAccess(hr, "/api/admin/destiny-one/safeguarding/reports")).toBe(false);
  });
});

test.describe("deploying before the migration doesn't lock admins out", () => {
  test("a role row from a database without the new columns keeps every existing role", async () => {
    const { rolesFromRow } = await import("../../lib/adminRoles");
    // What admin_roles looks like before 20260926/20260927 are applied.
    const oldRow = {
      auth_user_id: "x",
      email: "admin@example.org",
      training_admin: false,
      event_admin: true,
      store_admin: false,
      site_admin: false,
      host: false,
      hr_admin: false,
      design_admin: false,
      sermon_admin: false,
      super_admin: true,
    };
    const flags = rolesFromRow(oldRow);
    expect(flags.super_admin).toBe(true);
    expect(flags.event_admin).toBe(true);
    expect(flags.safeguarding_admin).toBe(false);
    expect(flags.destiny_one_admin).toBe(false);
    expect(hasAccess(flags, "/admin/hr")).toBe(true); // super admin still gets everywhere
  });

  test("only a real true grants a role", async () => {
    const { rolesFromRow } = await import("../../lib/adminRoles");
    expect(rolesFromRow({ super_admin: "true", host: 1 }).super_admin).toBe(false);
    expect(rolesFromRow({ super_admin: "true", host: 1 }).host).toBe(false);
  });
});
