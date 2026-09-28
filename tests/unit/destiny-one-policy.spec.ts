import { test, expect } from "@playwright/test";
import {
  toPrefixQuery,
  appGate,
  PUSH_PREVIEW_CHARS,
  pushPreviewText,
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

test.describe("pushPreviewText", () => {
  test("sender and first line only", () => {
    expect(pushPreviewText({ senderName: "Leah Simmons", body: "Thanks Jonathan\nSee you Sunday", attachmentMime: null })).toBe("Leah Simmons: Thanks Jonathan");
  });
  test("long lines are cut with an ellipsis", () => {
    const out = pushPreviewText({ senderName: "Tom", body: "a".repeat(300), attachmentMime: null });
    expect(out.length).toBe("Tom: ".length + PUSH_PREVIEW_CHARS);
    expect(out.endsWith("\u2026")).toBe(true);
  });
  test("attachment-only messages", () => {
    expect(pushPreviewText({ senderName: "Sam", body: null, attachmentMime: "image/jpeg" })).toBe("Sam: Photo");
    expect(pushPreviewText({ senderName: "Sam", body: "  ", attachmentMime: "application/pdf" })).toBe("Sam: File");
  });
});

test.describe("toPrefixQuery", () => {
  test("words become prefix terms", () => {
    expect(toPrefixQuery("Run  sheet!")).toBe("run:* & sheet:*");
  });
  test("operators and quotes can't get through", () => {
    expect(toPrefixQuery("a' | !b & (c)")).toBe("a:* & b:* & c:*");
  });
  test("too short or empty finds nothing", () => {
    expect(toPrefixQuery("")).toBeNull();
    expect(toPrefixQuery("x")).toBeNull();
    expect(toPrefixQuery("!!!")).toBeNull();
  });
  test("accented letters are kept", () => {
    expect(toPrefixQuery("Café")).toBe("café:*");
  });
});

test.describe("appGate (forced update / maintenance)", () => {
  const config = {
    minBuild: { ios: 5, android: 3 },
    forceUpdateMessage: null,
    maintenanceMessage: null,
    storeUrl: { ios: "itms-beta://", android: "https://play.google.com/store/apps/details?id=uk.destinytees.one" },
  };

  test("no config yet (first launch offline) never blocks", () => {
    expect(appGate(undefined, "ios", 1)).toBe("ok");
  });
  test("builds below the platform minimum must update", () => {
    expect(appGate(config, "ios", 4)).toBe("update");
    expect(appGate(config, "android", 2)).toBe("update");
  });
  test("builds at or above the minimum run", () => {
    expect(appGate(config, "ios", 5)).toBe("ok");
    expect(appGate(config, "android", 9)).toBe("ok");
  });
  test("each platform uses its own minimum", () => {
    expect(appGate(config, "android", 4)).toBe("ok");
  });
  test("no native build number (Expo Go, web) always runs", () => {
    expect(appGate(config, "ios", null)).toBe("ok");
    expect(appGate(config, "web", null)).toBe("ok");
  });
  test("maintenance blocks every build, even with no build number", () => {
    const down = { ...config, maintenanceMessage: "Back at 3pm." };
    expect(appGate(down, "ios", 99)).toBe("maintenance");
    expect(appGate(down, "web", null)).toBe("maintenance");
  });
});

test.describe("minimum age (13, decided 2026-09-28)", () => {
  test("the date someone turns 13", async () => {
    const { minimumAgeOn } = await import("../../packages/shared/src/destinyOne/policy");
    expect(minimumAgeOn("2012-03-04")).toBe("2025-03-04");
    expect(minimumAgeOn("2012-02-29")).toBe("2025-03-01"); // leap-day birthdays turn 13 on 1 March
    expect(minimumAgeOn("not a date")).toBeNull();
  });

  test("under 13 is refused, 13 today is allowed, no date of birth isn't judged", async () => {
    const { isUnderMinimumAge } = await import("../../packages/shared/src/destinyOne/policy");
    expect(isUnderMinimumAge("2014-01-01", "2026-09-28")).toBe(true);
    expect(isUnderMinimumAge("2013-09-28", "2026-09-28")).toBe(false);
    expect(isUnderMinimumAge(null, "2026-09-28")).toBe(false);
  });
});
