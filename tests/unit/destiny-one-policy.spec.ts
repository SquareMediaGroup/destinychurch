import { test, expect } from "@playwright/test";
import {
  REQUIRED_CONSENTS,
  adultOnFromDateOfBirth,
  canCreateCommunity,
  canCreateGroup,
  canPost,
  checkComposition,
  isAdult,
  outstandingConsents,
  validateMessageBody,
  type PolicyMember,
} from "../../packages/shared/src/destinyOne/policy";

/**
 * The TypeScript copy of Destiny One's safeguarding rules. The database is the
 * authority (tests/sql/destiny-one.sql proves that side); these tests pin the
 * copy the API and app use for early, friendly refusals, so it can't drift
 * into allowing something the database will then refuse — or worse, into
 * hiding a rule the app should be explaining.
 */

const member = (over: Partial<PolicyMember> = {}): PolicyMember => ({
  status: "active",
  roles: [],
  isAdult: true,
  ...over,
});

test.describe("adultOnFromDateOfBirth", () => {
  test("is the 18th birthday", () => {
    expect(adultOnFromDateOfBirth("2008-09-26")).toBe("2026-09-26");
  });

  test("29 February comes of age on 1 March in a non-leap year", () => {
    expect(adultOnFromDateOfBirth("2008-02-29")).toBe("2026-03-01");
  });

  test("29 February always rolls to 1 March (18 years on is never a leap year)", () => {
    expect(adultOnFromDateOfBirth("2012-02-29")).toBe("2030-03-01");
    expect(adultOnFromDateOfBirth("2012-02-28")).toBe("2030-02-28");
  });

  test("anything that isn't a real date is null (treated as a minor)", () => {
    for (const bad of [null, undefined, "", "not a date", "2008-02-30", "2008-13-01", "26/09/2008"]) {
      expect(adultOnFromDateOfBirth(bad)).toBeNull();
    }
  });

  test("accepts a timestamp and uses only the date", () => {
    expect(adultOnFromDateOfBirth("2000-01-15T00:00:00Z")).toBe("2018-01-15");
  });
});

test.describe("isAdult", () => {
  test("on the 18th birthday itself, they are an adult", () => {
    expect(isAdult("2026-09-26", "2026-09-26")).toBe(true);
  });
  test("the day before, they are not", () => {
    expect(isAdult("2026-09-26", "2026-09-25")).toBe(false);
  });
  test("no date means minor", () => {
    expect(isAdult(null, "2026-09-26")).toBe(false);
  });
});

test.describe("who can do what", () => {
  test("only active adult senior leadership can create a community", () => {
    expect(canCreateCommunity(member({ roles: ["senior_leadership"] }))).toBe(true);
    expect(canCreateCommunity(member({ roles: ["group_leader"] }))).toBe(false);
    expect(canCreateCommunity(member({ roles: ["senior_leadership"], status: "suspended" }))).toBe(false);
    expect(canCreateCommunity(member({ roles: ["senior_leadership"], isAdult: false }))).toBe(false);
  });

  test("group leaders and senior leadership can create groups; members can't", () => {
    expect(canCreateGroup(member({ roles: ["group_leader"] }))).toBe(true);
    expect(canCreateGroup(member({ roles: ["senior_leadership"] }))).toBe(true);
    expect(canCreateGroup(member())).toBe(false);
    expect(canCreateGroup(member({ roles: ["group_leader"], status: "pending" }))).toBe(false);
  });

  test("nobody posts in a frozen group", () => {
    expect(canPost({ member: member(), groupKind: "group", groupState: "frozen", myRole: "admin" })).toBe(false);
  });

  test("only admins post in Announcements", () => {
    expect(canPost({ member: member(), groupKind: "announcements", groupState: "active", myRole: "member" })).toBe(false);
    expect(canPost({ member: member(), groupKind: "announcements", groupState: "active", myRole: "admin" })).toBe(true);
  });

  test("minors can post in an ordinary active group", () => {
    expect(
      canPost({ member: member({ isAdult: false }), groupKind: "group", groupState: "active", myRole: "member" }),
    ).toBe(true);
  });

  test("non-members can't post", () => {
    expect(canPost({ member: member(), groupKind: "group", groupState: "active", myRole: null })).toBe(false);
  });
});

test.describe("group composition", () => {
  test("two people is a 1:1 in disguise and is refused", () => {
    expect(checkComposition({ members: 2, adults: 2 })).toMatchObject({ ok: false });
  });
  test("fewer than two adults is refused", () => {
    expect(checkComposition({ members: 10, adults: 1 })).toMatchObject({ ok: false });
  });
  test("three people with two adults is the minimum that passes", () => {
    expect(checkComposition({ members: 3, adults: 2 })).toEqual({ ok: true });
  });
});

test.describe("messages", () => {
  test("empty is refused unless there's an attachment", () => {
    expect(validateMessageBody("   ", false)).toMatchObject({ ok: false });
    expect(validateMessageBody("", true)).toEqual({ ok: true });
  });
  test("over 4000 characters is refused", () => {
    expect(validateMessageBody("x".repeat(4001), false)).toMatchObject({ ok: false });
    expect(validateMessageBody("x".repeat(4000), false)).toEqual({ ok: true });
  });
});

test.describe("consents", () => {
  test("everything is outstanding until accepted", () => {
    expect(outstandingConsents([])).toEqual([...REQUIRED_CONSENTS]);
  });
  test("an old version doesn't count", () => {
    const accepted = REQUIRED_CONSENTS.map((c) => ({ ...c, version: "2000-01" }));
    expect(outstandingConsents(accepted)).toHaveLength(REQUIRED_CONSENTS.length);
  });
  test("the chat review notice is always required", () => {
    // Members must be told chats aren't end-to-end encrypted and can be
    // reviewed by safeguarding. Removing this would be a GDPR transparency gap.
    expect(REQUIRED_CONSENTS.map((c) => c.document)).toContain("chat_review_notice");
  });
});
