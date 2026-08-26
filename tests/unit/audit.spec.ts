import { test, expect } from "@playwright/test";
import {
  MAX_VALUE_CHARS,
  REDACTED,
  diffRecords,
  fieldLabel,
  formatValue,
  rangeStart,
  relativeTime,
  sanitiseValue,
  snapshotRecord,
} from "../../lib/audit";

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

test("column names read as words", () => {
  expect(fieldLabel("target_url")).toBe("Target url");
  expect(fieldLabel("is_published")).toBe("Is published");
});

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
