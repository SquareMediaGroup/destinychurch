import { test, expect } from "@playwright/test";
import { getNextAlphaSession } from "../../lib/alphaSession";

/**
 * Course start dates arrive as date-only strings ("2026-09-30"). JavaScript
 * parses those as UTC midnight, so anywhere west of UTC they used to become
 * the day before — the site banner told US visitors the course started on a
 * Tuesday, and the server/browser disagreement threw React hydration error
 * #418 on every page. The next session must be the same calendar day whatever
 * zone the code runs in.
 *
 * Node re-reads process.env.TZ on change, so each case runs in several zones.
 */

const ZONES = ["Europe/London", "UTC", "America/Los_Angeles", "Asia/Tokyo"];

const label = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" });

function inEveryZone(fn: () => string): string[] {
  const original = process.env.TZ;
  try {
    return ZONES.map((zone) => {
      process.env.TZ = zone;
      return fn();
    });
  } finally {
    process.env.TZ = original;
  }
}

test("a future start date is the same day in every timezone", () => {
  const now = new Date("2026-09-24T12:00:00Z");
  const days = inEveryZone(() => label(getNextAlphaSession("2026-09-30", "weekly", null, now).date));
  expect(new Set(days)).toEqual(new Set(["Wed 30 September"]));
});

test("a weekly course that has started rolls to its next session", () => {
  const now = new Date("2026-09-24T12:00:00Z");
  const days = inEveryZone(() => label(getNextAlphaSession("2026-09-02", "weekly", null, now).date));
  expect(new Set(days)).toEqual(new Set(["Wed 30 September"]));
});

test("a fortnightly course stays on its weekday across the October clock change", () => {
  // BST ends 25 October 2026: sessions 14 Oct, 28 Oct, 11 Nov.
  const now = new Date("2026-11-05T12:00:00Z");
  const days = inEveryZone(() =>
    label(getNextAlphaSession("2026-10-14", "fortnightly", null, now).date)
  );
  expect(new Set(days)).toEqual(new Set(["Wed 11 November"]));
});

test("'today' is London's day, not the runtime's", () => {
  // 23:30 UTC on 29 Sept is already 30 Sept in London (BST), so a course
  // starting on the 30th is today's session, not a past one.
  const now = new Date("2026-09-29T23:30:00Z");
  const results = inEveryZone(() => {
    const s = getNextAlphaSession("2026-09-30", "weekly", null, now);
    return `${label(s.date)} first=${s.isFirst}`;
  });
  expect(new Set(results)).toEqual(new Set(["Wed 30 September first=true"]));
});
