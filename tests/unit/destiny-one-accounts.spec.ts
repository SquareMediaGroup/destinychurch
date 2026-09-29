import { test, expect } from "@playwright/test";
import {
  DOUBLE_PRESS_MS,
  OWNER_GRACE_MS,
  SIGN_IN_FAILED,
  canSendAs,
  checkAddedAccount,
  hasStaffAccess,
  isDoublePress,
  needsOwnerCheck,
  nextSlot,
  passwordRejection,
  sendAsCandidates,
  switchedNoticeText,
  validateNewPassword,
} from "../../packages/shared/src/destinyOne/accountRules";

test.describe("double press", () => {
  test("two taps inside the window count", () => {
    expect(isDoublePress(1000, 1000 + DOUBLE_PRESS_MS - 1)).toBe(true);
  });
  test("a slow second tap, or no first tap, does not", () => {
    expect(isDoublePress(1000, 1000 + DOUBLE_PRESS_MS + 1)).toBe(false);
    expect(isDoublePress(null, 1000)).toBe(false);
  });
});

test.describe("adding a child or admin account", () => {
  test("a child must be under 18", () => {
    expect(checkAddedAccount("child", { isAdult: false, isStaff: false })).toEqual({ ok: true });
    expect(checkAddedAccount("child", { isAdult: true, isStaff: false })).toEqual({ ok: false, message: "That account isn't a child account." });
  });
  test("an admin account must have staff access", () => {
    expect(checkAddedAccount("admin", { isAdult: true, isStaff: true })).toEqual({ ok: true });
    expect(checkAddedAccount("admin", { isAdult: true, isStaff: false })).toEqual({ ok: false, message: "That account doesn't have admin access." });
  });
  test("a plain member account is always fine", () => {
    expect(checkAddedAccount("member", { isAdult: true, isStaff: false })).toEqual({ ok: true });
  });
});

test.describe("next account to switch to", () => {
  const list = [
    { slot: "a", lastUsedAt: 10 },
    { slot: "b", lastUsedAt: 30 },
    { slot: "c", lastUsedAt: 20 },
  ];
  test("is the most recently used other account", () => {
    expect(nextSlot(list, "a")).toBe("b");
    expect(nextSlot(list, "b")).toBe("c");
  });
  test("toggles between two accounts", () => {
    expect(nextSlot(list.slice(0, 2), "a")).toBe("b");
    expect(nextSlot(list.slice(0, 2), "b")).toBe("a");
  });
  test("is null with a single account", () => {
    expect(nextSlot([{ slot: "a", lastUsedAt: 1 }], "a")).toBeNull();
    expect(nextSlot([], "a")).toBeNull();
  });
});

test.describe("owner check", () => {
  const now = 1_000_000;
  test("skipped when the device has no passcode", () => {
    expect(needsOwnerCheck({ enrolled: false, lastUsedAt: undefined, now })).toBe(false);
  });
  test("skipped inside the grace window, required after it", () => {
    expect(needsOwnerCheck({ enrolled: true, lastUsedAt: now - OWNER_GRACE_MS + 1, now })).toBe(false);
    expect(needsOwnerCheck({ enrolled: true, lastUsedAt: now - OWNER_GRACE_MS - 1, now })).toBe(true);
  });
  test("required for an account never used on this device", () => {
    expect(needsOwnerCheck({ enrolled: true, lastUsedAt: undefined, now })).toBe(true);
  });
});

test.describe("send as", () => {
  const a = { slot: "a", kind: "member" as const, isAdult: true };
  const admin = { slot: "b", kind: "admin" as const, isAdult: true };
  const child = { slot: "c", kind: "child" as const, isAdult: false };
  const unlabelledMinor = { slot: "d", kind: "member" as const, isAdult: false };
  const accts = [a, admin, child, unlabelledMinor];
  test("offers other member and admin accounts that are in the group", () => {
    expect(sendAsCandidates(accts, "a", new Set(["a", "b"]))).toEqual([admin]);
  });
  test("never offers a child account, labelled or not", () => {
    expect(sendAsCandidates(accts, "a", new Set(["a", "b", "c", "d"]))).toEqual([admin]);
  });
  test("offers nothing when no other account is a member", () => {
    expect(sendAsCandidates(accts, "a", new Set(["a"]))).toEqual([]);
    expect(sendAsCandidates(accts, "a", new Set())).toEqual([]);
  });
  test("a child account can't send as anyone", () => {
    expect(canSendAs(child)).toBe(false);
    expect(canSendAs(unlabelledMinor)).toBe(false);
    expect(canSendAs(a)).toBe(true);
    expect(canSendAs(admin)).toBe(true);
    expect(canSendAs(undefined)).toBe(false);
  });
});

test("banner wording", () => {
  expect(switchedNoticeText("Amy Reed")).toBe("Switched to Amy Reed profile");
});

test.describe("new password", () => {
  test("accepts ten or more characters", () => {
    expect(validateNewPassword("correct-horse-9", "a@b.co")).toBeNull();
  });
  test("rejects short, blank, and email-equal passwords", () => {
    expect(validateNewPassword("short", null)).toMatch(/at least 10/);
    expect(validateNewPassword("          ", null)).not.toBeNull();
    expect(validateNewPassword("Amy@Example.com", "amy@example.com")).not.toBeNull();
  });
});

test("one message for every failed sign-in", () => {
  expect(SIGN_IN_FAILED).toBe("That email or password isn't right.");
});

test.describe("staff access", () => {
  test("any of the three roles counts", () => {
    expect(hasStaffAccess({ destiny_one_admin: true })).toBe(true);
    expect(hasStaffAccess({ safeguarding_admin: true })).toBe(true);
    expect(hasStaffAccess({ super_admin: true })).toBe(true);
  });
  test("no row, or no roles, does not", () => {
    expect(hasStaffAccess(null)).toBe(false);
    expect(hasStaffAccess({ destiny_one_admin: false, safeguarding_admin: null })).toBe(false);
  });
});

test.describe("rejected passwords (Supabase leaked password protection)", () => {
  test("a breached password says so, and asks for a different one", () => {
    const r = passwordRejection(["pwned"]);
    expect(r.breached).toBe(true);
    expect(r.title).toBe("This password has been leaked");
    expect(r.body).toContain("choose a different one");
  });

  test("breached wins when Supabase gives several reasons", () => {
    expect(passwordRejection(["length", "pwned"]).breached).toBe(true);
  });

  test("weak but not breached gets advice, not a breach warning", () => {
    expect(passwordRejection(["characters"]).breached).toBe(false);
    expect(passwordRejection(["length"]).body).toContain("at least 10 characters");
    expect(passwordRejection(["length"], 8).body).toContain("at least 8 characters");
  });

  test("an unknown reason still gets a readable message", () => {
    expect(passwordRejection(["something-new"]).title).toBeTruthy();
  });
});
