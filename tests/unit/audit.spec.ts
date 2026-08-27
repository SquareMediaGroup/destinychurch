import { test, expect } from "@playwright/test";
import {
  MAX_VALUE_CHARS,
  REDACTED,
  diffRecords,
  fieldLabel,
  formatValue,
  fullTimestamp,
  humanise,
  rangeStart,
  relativeTime,
  sanitiseValue,
  siteDate,
  siteDateTime,
  siteDayBounds,
  siteDayKey,
  snapshotRecord,
} from "../../lib/audit";
import { ROLE_LABELS, roleLabel, roleList } from "../../lib/adminRoles";

/**
 * The audit log's two promises, both of which live in lib/audit.ts:
 *
 *  1. It records what actually changed — not every column a form happened to
 *     re-send, which is what turns a log into noise nobody reads.
 *  2. It never records a secret. An admin creating a login posts a password;
 *     "who created this login" has to be answerable without that password
 *     being readable by anyone who can open the log a year later.
 */

/* ── Diffing ─────────────────────────────────────────────────────────────── */

test("a diff contains only the fields that moved", () => {
  const changes = diffRecords(
    { name: "Faith Hoodie", stock: 10, colour: "black" },
    { name: "Faith Hoodie", stock: 4, colour: "black" },
  );
  expect(Object.keys(changes ?? {})).toEqual(["stock"]);
  expect(changes?.stock).toEqual({ from: 10, to: 4 });
});

test("a save with nothing changed produces no diff at all", () => {
  expect(diffRecords({ name: "A" }, { name: "A" })).toBeNull();
});

test("timestamps and ids are never treated as changes", () => {
  // Every update writes updated_at; if that counted, every entry would claim a
  // change and the "1 field" hint on the list would always read wrong.
  const changes = diffRecords(
    { id: "1", title: "Old", updated_at: "2026-01-01", created_at: "2025-01-01" },
    { id: "1", title: "Old", updated_at: "2026-02-02", created_at: "2025-01-01" },
  );
  expect(changes).toBeNull();
});

test("a form's string is not a change against the row's number", () => {
  // Forms post "12" where the column holds 12. Left alone, every numeric field
  // on the page would show as edited every time anyone pressed save.
  expect(diffRecords({ sort_order: 12 }, { sort_order: "12" })).toBeNull();
});

test("only the fields the caller sent are diffed", () => {
  // A PATCH sends three fields; it must not read as "everything else was
  // cleared" just because the payload didn't mention those columns.
  const changes = diffRecords(
    { title: "Old", body: "Long body", is_published: false },
    { title: "New" },
  );
  expect(Object.keys(changes ?? {})).toEqual(["title"]);
});

test("a create records the whole record as new", () => {
  const changes = snapshotRecord({ name: "Faith Hoodie", stock: 10 });
  expect(changes?.name).toEqual({ from: null, to: "Faith Hoodie" });
  expect(changes?.stock).toEqual({ from: null, to: 10 });
});

/* ── Redaction ───────────────────────────────────────────────────────────── */

test("anything that looks like a secret is redacted, whatever it is called", () => {
  for (const key of [
    "password",
    "new_password",
    "passwordConfirm",
    "password_hash",
    "api_key",
    "stripe_secret",
    "authorization",
  ]) {
    expect(sanitiseValue(key, "hunter2"), `${key} must be redacted`).toBe(REDACTED);
  }
});

test("a redacted field still shows up as having changed", () => {
  // The point isn't to hide that a password was set — it's to not store it.
  const changes = diffRecords({ password_hash: "old" }, { password_hash: "new" });
  expect(Object.keys(changes ?? {})).toEqual(["password_hash"]);
  expect(changes?.password_hash.to).toBe(REDACTED);
});

test("nested secrets are caught too", () => {
  const value = sanitiseValue("payload", { email: "a@b.c", password: "hunter2" }) as Record<
    string,
    unknown
  >;
  expect(value.email).toBe("a@b.c");
  expect(value.password).toBe(REDACTED);
});

/* ── Size ────────────────────────────────────────────────────────────────── */

test("a long value is clipped and says how much was dropped", () => {
  const body = "x".repeat(MAX_VALUE_CHARS + 500);
  const value = sanitiseValue("body", body) as string;
  expect(value.length).toBeLessThan(body.length);
  expect(value).toContain("+500 more characters");
});

test("a big nested array is described rather than copied", () => {
  const value = sanitiseValue("page", {
    blocks: Array.from({ length: 40 }, (_, i) => ({ type: "text", i })),
  }) as Record<string, unknown>;
  expect(value.blocks).toBe("[40 items]");
});

/* ── Presentation ────────────────────────────────────────────────────────── */

test("booleans and blanks read as words too", () => {
  expect(formatValue(true)).toBe("Yes");
  expect(formatValue(false)).toBe("No");
  expect(formatValue(null)).toBe("—");
  expect(formatValue("")).toBe("—");
});

test("relative times read the way someone would say them", () => {
  const now = new Date("2026-08-26T12:00:00Z").getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  expect(relativeTime(ago(10_000), now)).toBe("just now");
  expect(relativeTime(ago(5 * 60_000), now)).toBe("5 minutes ago");
  expect(relativeTime(ago(60 * 60_000), now)).toBe("1 hour ago");
  expect(relativeTime(ago(3 * 24 * 60 * 60_000), now)).toBe("3 days ago");
  // Past a fortnight a real date is more use than "27 days ago".
  expect(relativeTime(ago(60 * 24 * 60 * 60_000), now)).toContain("2026");
});

/* ── Ranges ──────────────────────────────────────────────────────────────── */

test("a time range resolves to a start, and 'all time' to none", () => {
  const now = new Date("2026-08-26T12:00:00Z");
  expect(rangeStart("week", now)).toBe("2026-08-19T12:00:00.000Z");
  expect(rangeStart("all", now)).toBeNull();
  // An unrecognised range means no lower bound, same as "All time" — the log is
  // Super Admin only, so the safe failure here is showing more, not less.
  expect(rangeStart("nonsense", now)).toBeNull();
});

/* ── Time zone ───────────────────────────────────────────────────────────── */

/**
 * The bug these pin down: rows are stored in UTC and Vercel runs in UTC, so a
 * timestamp formatted without naming a zone reads an hour early from late March
 * to late October. The AI shipped quoting UTC as though it were local — "9:07am"
 * for something that happened at 10:07 — which is the one thing a record of
 * *when* things happened must never do.
 */

test("summer times are British Summer Time, not UTC", () => {
  // 09:07 UTC on 27 August is 10:07 in Stockton-on-Tees.
  expect(siteDateTime("2026-08-27T09:07:00Z")).toContain("10:07am");
  expect(siteDateTime("2026-08-27T09:07:00Z")).toContain("27 Aug 2026");
});

test("winter times are GMT, so they are left alone", () => {
  expect(siteDateTime("2026-01-15T09:07:00Z")).toContain("9:07am");
});

test("a date near midnight lands on the right day here, not in UTC", () => {
  // 23:30 UTC on 26 August is already the 27th locally.
  expect(siteDate("2026-08-26T23:30:00Z")).toBe("27 Aug 2026");
  expect(siteDayKey(new Date("2026-08-26T23:30:00Z"))).toBe("2026-08-27");
});

test("the detail view says which clock it means", () => {
  // Ambiguity here is the whole problem, so the zone is named on screen.
  expect(fullTimestamp("2026-08-27T09:07:00Z")).toMatch(/GMT\+1|BST/);
  expect(fullTimestamp("2026-01-15T09:07:00Z")).toMatch(/GMT/);
});

test("a day filter covers that day here, not the UTC one", () => {
  // Through BST, UTC midnight is 1am local — so filtering "today" against it
  // would quietly include the last hour of yesterday evening.
  const summer = siteDayBounds("2026-08-27");
  expect(summer?.start).toBe("2026-08-26T23:00:00.000Z");
  expect(summer?.end).toBe("2026-08-27T22:59:59.999Z");

  const winter = siteDayBounds("2026-01-15");
  expect(winter?.start).toBe("2026-01-15T00:00:00.000Z");

  // Anything that isn't a bare date is left for the caller to pass through.
  expect(siteDayBounds("2026-08-27T09:00:00Z")).toBeNull();
  expect(siteDayBounds("last tuesday")).toBeNull();
});

/* ── Reading like words, not like a schema ───────────────────────────────── */

test("roles are named, never printed as columns", () => {
  expect(roleLabel("super_admin")).toBe("Super Admin");
  expect(roleLabel("hr_admin")).toBe("HR Admin");
  expect(roleList(["event_admin", "store_admin", "site_admin"])).toBe(
    "Event Admin, Store Admin and Site Admin",
  );
  expect(roleList(["host"])).toBe("Host");
  expect(roleList([])).toBe("");
});

test("every role has a label — a new one can't ship as a column name", () => {
  for (const [role, label] of Object.entries(ROLE_LABELS)) {
    expect(label, `${role} needs a human label`).not.toContain("_");
  }
});

test("stored values read as words", () => {
  expect(humanise("one_off")).toBe("One-off");
  expect(humanise("youth_alpha")).toBe("Youth Alpha");
  expect(humanise("shortlisted")).toBe("Shortlisted");
});

test("bare identifiers in a diff are tidied, real content is not", () => {
  expect(formatValue("super_admin")).toBe("Super Admin");
  expect(formatValue("one_off")).toBe("One-off");
  // The heuristic must not touch anything that is actually content.
  expect(formatValue("sarah@example.org")).toBe("sarah@example.org");
  expect(formatValue("https://example.org/a_b")).toBe("https://example.org/a_b");
  expect(formatValue("faith-hoodie")).toBe("faith-hoodie");
  expect(formatValue("A sentence with_an underscore")).toBe(
    "A sentence with_an underscore",
  );
});

test("a list of roles reads as a list, not as JSON", () => {
  expect(formatValue(["super_admin", "host"])).toBe("Super Admin, Host");
});

test("the field names people actually see are the worst offenders, so they are named", () => {
  expect(fieldLabel("is_published")).toBe("Published");
  expect(fieldLabel("base_price_pennies")).toBe("Price");
  expect(fieldLabel("super_admin")).toBe("Super Admin");
  expect(fieldLabel("target_url")).toBe("Points to");
  // Anything unlisted still falls through to something readable.
  expect(fieldLabel("some_new_column")).toBe("Some new column");
});
