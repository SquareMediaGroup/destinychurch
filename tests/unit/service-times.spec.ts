import { test, expect } from "@playwright/test";
import {
  formatCountdown,
  formatServiceDay,
  nextSundayService,
} from "../../lib/serviceTimes";

/**
 * "Sunday 11am" means 11am in Stockton-on-Tees, whatever the server's clock is
 * set to and wherever the reader happens to be. These pin down the two things
 * that are easy to get wrong: the British Summer Time boundaries, and what
 * counts as "next" while a service is actually running.
 *
 * In 2026 BST runs 29 March – 25 October.
 */

/** ISO instants keep the expectations unambiguous about UTC vs London. */
const iso = (d: Date) => d.toISOString();

test("during GMT, 11am London is 11:00 UTC", () => {
  // Wednesday 21 January 2026, mid-winter.
  const next = nextSundayService(new Date("2026-01-21T09:00:00Z"));
  expect(iso(next)).toBe("2026-01-25T11:00:00.000Z");
});

test("during BST, 11am London is 10:00 UTC", () => {
  // Wednesday 5 August 2026.
  const next = nextSundayService(new Date("2026-08-05T09:00:00Z"));
  expect(iso(next)).toBe("2026-08-09T10:00:00.000Z");
});

test("the week the clocks go forward resolves to BST", () => {
  // Wednesday 25 March 2026 — still GMT; the target Sunday is the changeover.
  const next = nextSundayService(new Date("2026-03-25T12:00:00Z"));
  expect(iso(next)).toBe("2026-03-29T10:00:00.000Z");
});

test("the week the clocks go back resolves to GMT", () => {
  // Wednesday 21 October 2026 — still BST; the target Sunday is the changeover.
  const next = nextSundayService(new Date("2026-10-21T12:00:00Z"));
  expect(iso(next)).toBe("2026-10-25T11:00:00.000Z");
});

test("a Sunday morning before the service points at today", () => {
  // 09:00 BST on Sunday 9 August.
  const next = nextSundayService(new Date("2026-08-09T08:00:00Z"));
  expect(iso(next)).toBe("2026-08-09T10:00:00.000Z");
});

test("mid-service still points at today, not next week", () => {
  // 11:45 BST — someone watching the stream shouldn't be told the next
  // service is six days away.
  const next = nextSundayService(new Date("2026-08-09T10:45:00Z"));
  expect(iso(next)).toBe("2026-08-09T10:00:00.000Z");
});

test("after the service ends it rolls to next Sunday", () => {
  // 13:00 BST, half an hour after the 12:30 finish.
  const next = nextSundayService(new Date("2026-08-09T12:00:00Z"));
  expect(iso(next)).toBe("2026-08-16T10:00:00.000Z");
});

test("just after midnight on a Monday still finds the coming Sunday", () => {
  // 00:30 BST Monday 10 August. Stepping a raw six days from *now* rather than
  // from London noon could land this on the Saturday across a DST boundary.
  const next = nextSundayService(new Date("2026-08-09T23:30:00Z"));
  expect(iso(next)).toBe("2026-08-16T10:00:00.000Z");
});

test("just before midnight on the Saturday finds the next morning", () => {
  // 23:45 BST Saturday 8 August.
  const next = nextSundayService(new Date("2026-08-08T22:45:00Z"));
  expect(iso(next)).toBe("2026-08-09T10:00:00.000Z");
});

test("the service day is formatted in London's calendar", () => {
  expect(formatServiceDay(new Date("2026-08-09T10:00:00Z"))).toBe("Sunday 9 August");
  // 00:30 BST on the 10th is still the 9th in UTC — the label must follow London.
  expect(formatServiceDay(new Date("2026-08-09T23:30:00Z"))).toBe("Monday 10 August");
});

test("countdowns read coarse-to-fine and stop at zero", () => {
  const target = new Date("2026-08-09T10:00:00Z");
  expect(formatCountdown(target, new Date("2026-08-07T06:00:00Z"))).toBe("2 days 4 hours");
  expect(formatCountdown(target, new Date("2026-08-08T10:00:00Z"))).toBe("1 day 0 hours");
  expect(formatCountdown(target, new Date("2026-08-09T07:30:00Z"))).toBe("2 hours 30 minutes");
  expect(formatCountdown(target, new Date("2026-08-09T09:42:00Z"))).toBe("18 minutes");
  expect(formatCountdown(target, new Date("2026-08-09T09:59:50Z"))).toBe("1 minute");
  expect(formatCountdown(target, new Date("2026-08-09T10:00:00Z"))).toBeNull();
  expect(formatCountdown(target, new Date("2026-08-09T11:00:00Z"))).toBeNull();
});
