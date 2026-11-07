import { test, expect } from "@playwright/test";
import { describeWindow, formatLondon, isWithinWindow, parseWindow, windowState } from "../../lib/schedule";

/**
 * Banner and popup "Show from / Hide after" windows are applied in the layout
 * with no cron job, so the window maths and the UK-time display are pinned
 * down here.
 */

const NOW = Date.parse("2026-11-05T14:00:00Z");

test("a row with no window is always inside it", () => {
  expect(isWithinWindow({}, NOW)).toBe(true);
  expect(isWithinWindow({ starts_at: null, ends_at: null }, NOW)).toBe(true);
});

test("before the start and from the end, a row is outside its window", () => {
  const row = { starts_at: "2026-11-05T16:00:00Z", ends_at: "2026-11-06T15:00:00Z" };
  expect(isWithinWindow(row, NOW)).toBe(false);
  expect(isWithinWindow(row, Date.parse("2026-11-05T16:00:00Z"))).toBe(true);
  expect(isWithinWindow(row, Date.parse("2026-11-06T14:59:59Z"))).toBe(true);
  expect(isWithinWindow(row, Date.parse("2026-11-06T15:00:00Z"))).toBe(false);
});

test("windowState says off, scheduled, live or ended", () => {
  expect(windowState({ active: false, starts_at: null }, NOW)).toBe("off");
  expect(windowState({ active: true, starts_at: "2026-11-05T16:00:00Z" }, NOW)).toBe("scheduled");
  expect(windowState({ active: true, ends_at: "2026-11-05T13:00:00Z" }, NOW)).toBe("ended");
  expect(windowState({ active: true }, NOW)).toBe("live");
});

test("parseWindow only returns the bounds that were sent", () => {
  expect(parseWindow({ message: "hi" })).toEqual({ ok: true, fields: {} });
  expect(parseWindow({ starts_at: "" })).toEqual({ ok: true, fields: { starts_at: null } });
  expect(parseWindow({ ends_at: "2026-11-06T15:00:00+00:00" })).toEqual({
    ok: true,
    fields: { ends_at: "2026-11-06T15:00:00.000Z" },
  });
});

test("parseWindow refuses bad dates and an end before the start", () => {
  expect(parseWindow({ starts_at: "next tuesday" }).ok).toBe(false);
  expect(
    parseWindow({ starts_at: "2026-11-06T15:00:00Z", ends_at: "2026-11-06T12:00:00Z" }).ok,
  ).toBe(false);
});

test("times are shown in UK time", () => {
  expect(formatLondon("2026-11-06T12:00:00Z")).toBe("Fri 6 Nov, 12:00");
  expect(formatLondon("2026-07-06T12:00:00Z")).toBe("Mon 6 Jul, 13:00");
  expect(describeWindow("2026-11-06T12:00:00Z", "2026-11-06T15:00:00Z")).toBe(
    "from Fri 6 Nov, 12:00 until Fri 6 Nov, 15:00",
  );
  expect(describeWindow(null, null)).toBe("straight away, with no end time");
});
