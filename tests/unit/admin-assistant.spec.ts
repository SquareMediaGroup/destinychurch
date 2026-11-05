import { test, expect } from "@playwright/test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { isWithinWindow, parseWindow, windowState } from "../../lib/schedule";
import {
  checkFutureTime,
  describeWindow,
  formatLondon,
  londonIso,
  londonOffset,
  resolveWindow,
} from "../../lib/adminAgent/time";
import { argsWithFollowUps, unacknowledgedDestructive } from "../../lib/adminAgent/gating";
import { buildBody } from "../../lib/adminAgent/postBody";
import { buildSystemPrompt } from "../../lib/adminAgent/prompt";
import { hasAccess, NO_ROLES } from "../../lib/adminRoles";

/**
 * DestinyAI in Destiny Admin turns "a maintenance banner 12-3pm tomorrow, live
 * in 2 hours" into scheduled changes, so the parts that decide *when* and
 * *whether* something runs are pinned down here: the window maths, the UK-time
 * handling either side of a clock change, and the rule that a destructive step
 * never runs without its own second confirmation.
 */

const NOW = Date.parse("2026-11-05T14:00:00Z");

/* ── Windows (banner, popup) ─────────────────────────────────────────────── */

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

/* ── UK time ─────────────────────────────────────────────────────────────── */

test("London is +00:00 in winter and +01:00 in British Summer Time", () => {
  expect(londonOffset(new Date("2026-11-05T14:00:00Z"))).toBe("+00:00");
  expect(londonOffset(new Date("2026-07-01T12:00:00Z"))).toBe("+01:00");
  // Either side of the clocks going forward (01:00 UTC, 29 March 2026).
  expect(londonOffset(new Date("2026-03-29T00:59:00Z"))).toBe("+00:00");
  expect(londonOffset(new Date("2026-03-29T01:00:00Z"))).toBe("+01:00");
});

test("londonIso is the wall-clock time with its offset", () => {
  expect(londonIso(new Date("2026-11-05T14:03:00Z"))).toBe("2026-11-05T14:03:00+00:00");
  expect(londonIso(new Date("2026-07-01T11:30:00Z"))).toBe("2026-07-01T12:30:00+01:00");
});

test("times are shown in UK time", () => {
  expect(formatLondon("2026-11-06T12:00:00Z")).toBe("Fri 6 Nov, 12:00");
  expect(formatLondon("2026-07-06T12:00:00Z")).toBe("Mon 6 Jul, 13:00");
  expect(describeWindow("2026-11-06T12:00:00Z", "2026-11-06T15:00:00Z")).toBe(
    "from Fri 6 Nov, 12:00 until Fri 6 Nov, 15:00",
  );
  expect(describeWindow(null, null)).toBe("straight away, with no end time");
});

test("a time without an offset is refused, so the server's timezone never decides", () => {
  const result = checkFutureTime("2026-11-06T12:00:00", NOW);
  expect(result.ok).toBe(false);
});

test("a time in the past is refused when proposing, allowed as a start when confirming", () => {
  expect(checkFutureTime("2026-11-04T12:00:00+00:00", NOW).ok).toBe(false);
  // A couple of minutes ago is fine either way (clock skew, slow typing).
  expect(checkFutureTime("2026-11-05T13:58:00+00:00", NOW).ok).toBe(true);
  expect(resolveWindow("2026-11-05T13:00:00+00:00", undefined, NOW, false).ok).toBe(false);
  expect(resolveWindow("2026-11-05T13:00:00+00:00", undefined, NOW, true).ok).toBe(true);
});

test("the example request resolves to the right window", () => {
  // "12-3pm tomorrow, live in 2 hours", asked at 14:00 on Thu 5 Nov.
  const result = resolveWindow("2026-11-05T16:00:00+00:00", "2026-11-06T15:00:00+00:00", NOW);
  expect(result).toEqual({ ok: true, starts: "2026-11-05T16:00:00.000Z", ends: "2026-11-06T15:00:00.000Z" });
});

test("an end before the start, or already past, is refused", () => {
  expect(resolveWindow("2026-11-06T15:00:00+00:00", "2026-11-06T12:00:00+00:00", NOW).ok).toBe(false);
  expect(resolveWindow(undefined, "2026-11-05T13:00:00+00:00", NOW, true).ok).toBe(false);
});

/* ── Confirm gating ──────────────────────────────────────────────────────── */

test("a destructive step without its own acknowledgement is held back", () => {
  const steps = [
    { id: "a", risk: "write" as const },
    { id: "b", risk: "destructive" as const },
    { id: "c", risk: "destructive" as const },
  ];
  expect(unacknowledgedDestructive(steps)).toEqual(["b", "c"]);
  expect(unacknowledgedDestructive(steps, ["b"])).toEqual(["c"]);
  expect(unacknowledgedDestructive(steps, ["b", "c"])).toEqual([]);
  // Acknowledging a write step doesn't count for a destructive one.
  expect(unacknowledgedDestructive(steps, ["a"])).toEqual(["b", "c"]);
});

test("follow-ups switched on are merged into the step; the defaults apply when none are sent", () => {
  const action = {
    args: { message: "Maintenance", starts_at: "2026-11-05T16:00:00+00:00" },
    follow_ups: [
      { label: "Remove it at 15:00", changes: { ends_at: "2026-11-06T15:00:00+00:00" }, on_by_default: true },
      { label: "Make it orange", changes: { type: "announcement" }, on_by_default: false },
    ],
  };
  expect(argsWithFollowUps(action, undefined)).toEqual({ ...action.args, ends_at: "2026-11-06T15:00:00+00:00" });
  expect(argsWithFollowUps(action, [])).toEqual(action.args);
  expect(argsWithFollowUps(action, [1])).toEqual({ ...action.args, type: "announcement" });
  expect(argsWithFollowUps(action, [7])).toEqual(action.args);
});

/* ── Post bodies ─────────────────────────────────────────────────────────── */

test("post bodies are built from escaped plain text, never model HTML", () => {
  const html = buildBody([
    { heading: "Times & places", paragraphs: ["Sunday <b>10am</b>", "  ", "<script>alert(1)</script>"] },
  ]);
  expect(html).toBe(
    "<h2>Times &amp; places</h2><p>Sunday &lt;b&gt;10am&lt;/b&gt;</p><p>&lt;script&gt;alert(1)&lt;/script&gt;</p>",
  );
});

/* ── Wiring ──────────────────────────────────────────────────────────────── */

test("every admin can open DestinyAI; what it can change is checked per tool", () => {
  expect(hasAccess({ ...NO_ROLES, store_admin: true }, "/admin/assistant")).toBe(true);
  expect(hasAccess({ ...NO_ROLES, store_admin: true }, "/api/admin/assistant")).toBe(true);
  expect(hasAccess({ ...NO_ROLES, store_admin: true }, "/api/admin/assistant/plans/x")).toBe(true);
  // ...but the APIs its tools call keep their own rules.
  expect(hasAccess({ ...NO_ROLES, store_admin: true }, "/api/admin/posts")).toBe(false);
  expect(hasAccess({ ...NO_ROLES, store_admin: true }, "/api/admin/popup")).toBe(false);
});

test("DestinyAI is told the UK time and that write tools only propose", () => {
  const prompt = buildSystemPrompt({
    email: "admin@example.com",
    roles: { ...NO_ROLES, super_admin: true },
    now: new Date(NOW),
  });
  expect(prompt).toContain("Thursday 2026-11-05T14:00:00+00:00");
  expect(prompt).toContain("only PROPOSE");
  expect(prompt).toContain("Super Admin");
  expect(prompt).toContain("no emojis");
});

test("every DestinyAI write tool goes through a route handler, never the database directly", () => {
  // The tools must reach the site through the same handlers as the admin
  // pages, so validation, role checks and the audit entry can't be skipped.
  const dir = join(process.cwd(), "lib", "adminAgent", "tools");
  for (const file of readdirSync(dir)) {
    const source = readFileSync(join(dir, file), "utf8");
    expect(source, `${file} writes to the database directly`).not.toMatch(/\.(insert|update|upsert|delete)\(/);
    expect(source, `${file} has no route handler import`).toMatch(/from "@\/app\/api\/admin\//);
  }
});
