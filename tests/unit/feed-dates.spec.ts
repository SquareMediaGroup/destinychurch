import { test, expect } from "@playwright/test";
import { feedDateToIso } from "../../packages/shared/src/churchsuite/dates";

/**
 * The ChurchSuite calendar feed sends naive Europe/London wall clock —
 * "2026-07-30 00:00:00", no offset. The website gets away with this because it
 * formats without an explicit `timeZone`, so the error round-trips invisibly.
 * The iOS app does not: it decodes these as instants, so an unqualified
 * timestamp is an hour out for the whole of BST.
 *
 * `feedDateToIso` is the boundary fix. These pin down the DST edges and, more
 * importantly, that the value still reads as the same wall clock in London
 * after the round trip — that is the property that actually matters.
 *
 * In 2026 BST runs 29 March – 25 October.
 */

/** What London's clocks read at the given instant. */
const londonWallClock = (isoString: string) =>
  new Date(isoString).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "short",
    timeStyle: "medium",
    hour12: false,
  });

test("a BST timestamp gains the +01:00 offset", () => {
  expect(feedDateToIso("2026-07-30 00:00:00")).toBe("2026-07-30T00:00:00+01:00");
});

test("a GMT timestamp gains the +00:00 offset", () => {
  expect(feedDateToIso("2026-01-15 11:00:00")).toBe("2026-01-15T11:00:00+00:00");
});

test("the morning the clocks go forward switches offset mid-day", () => {
  // 29 March 2026: 01:00 GMT becomes 02:00 BST.
  expect(feedDateToIso("2026-03-29 00:30:00")).toBe("2026-03-29T00:30:00+00:00");
  expect(feedDateToIso("2026-03-29 02:00:00")).toBe("2026-03-29T02:00:00+01:00");
});

test("the morning the clocks go back switches offset mid-day", () => {
  // 25 October 2026: 02:00 BST becomes 01:00 GMT.
  expect(feedDateToIso("2026-10-25 00:30:00")).toBe("2026-10-25T00:30:00+01:00");
  expect(feedDateToIso("2026-10-25 03:00:00")).toBe("2026-10-25T03:00:00+00:00");
});

test("the wall clock survives the round trip in every season", () => {
  // The real requirement: a 7:30pm event still reads as 7:30pm in Stockton.
  for (const feedValue of [
    "2026-01-15 19:30:00",
    "2026-04-02 19:30:00",
    "2026-07-30 19:30:00",
    "2026-11-05 19:30:00",
  ]) {
    const [date, time] = feedValue.split(" ");
    const [y, m, d] = date.split("-");
    expect(londonWallClock(feedDateToIso(feedValue))).toBe(
      `${d}/${m}/${y}, ${time}`,
    );
  }
});

test("a missing seconds component is filled in", () => {
  expect(feedDateToIso("2026-12-25 10:00")).toBe("2026-12-25T10:00:00+00:00");
});

test("values that already carry a zone are passed through untouched", () => {
  // Double-qualifying an instant would shift it a second time.
  expect(feedDateToIso("2026-07-30T00:00:00Z")).toBe("2026-07-30T00:00:00Z");
  expect(feedDateToIso("2026-07-30T00:00:00+01:00")).toBe(
    "2026-07-30T00:00:00+01:00",
  );
});

test("unparseable input is passed through rather than invented", () => {
  expect(feedDateToIso("")).toBe("");
  expect(feedDateToIso("not a date")).toBe("not a date");
});
