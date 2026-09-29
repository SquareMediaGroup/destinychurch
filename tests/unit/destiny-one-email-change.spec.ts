import { test, expect } from "@playwright/test";
import { checkTicket, issueTicket, newEmailCode } from "../../lib/destinyOne/emailChange";

/**
 * Changing your Destiny One sign-in email: the sealed ticket must only work
 * for the account that asked, with the code that was emailed, until it expires.
 */

const SECRET = "test-secret-that-is-long-enough-1234";
const UID = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

test.describe("email change ticket", () => {
  test("the right code on your own ticket gives the new address", () => {
    const ticket = issueTicket(UID, "new@example.org", "123456", SECRET);
    expect(checkTicket(ticket, UID, "123456", SECRET)).toEqual({ ok: true, email: "new@example.org" });
  });

  test("a wrong code is refused", () => {
    const ticket = issueTicket(UID, "new@example.org", "123456", SECRET);
    expect(checkTicket(ticket, UID, "654321", SECRET)).toEqual({ ok: false, reason: "wrong_code" });
  });

  test("another account can't use your ticket, even with the code", () => {
    const ticket = issueTicket(UID, "new@example.org", "123456", SECRET);
    expect(checkTicket(ticket, OTHER, "123456", SECRET)).toEqual({ ok: false, reason: "expired" });
  });

  test("a forged or tampered ticket is refused", () => {
    const ticket = issueTicket(UID, "new@example.org", "123456", SECRET);
    expect(checkTicket(ticket, UID, "123456", "a-different-secret-entirely-00000")).toEqual({ ok: false, reason: "expired" });
    const flipped = ticket.slice(0, -2) + (ticket.endsWith("A") ? "BB" : "AA");
    expect(checkTicket(flipped, UID, "123456", SECRET).ok).toBe(false);
    expect(checkTicket("nonsense", UID, "123456", SECRET).ok).toBe(false);
  });

  test("an expired ticket is refused", () => {
    const ticket = issueTicket(UID, "new@example.org", "123456", SECRET, -1);
    expect(checkTicket(ticket, UID, "123456", SECRET)).toEqual({ ok: false, reason: "expired" });
  });

  test("codes are 6 digits", () => {
    for (let i = 0; i < 200; i++) expect(newEmailCode()).toMatch(/^\d{6}$/);
  });
});
