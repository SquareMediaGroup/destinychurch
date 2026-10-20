import { test, expect } from "@playwright/test";
import { DRAFT_FIELDS, pickDraftFields, postState } from "../../lib/posts";
import { parsePageSettings } from "../../lib/posts-fields";

const NOW = Date.parse("2026-12-24T12:00:00Z");
const base = { is_published: true, publish_from: null, publish_until: null };

test("a post's state follows publish and its schedule", () => {
  expect(postState({ ...base, is_published: false }, NOW)).toBe("draft");
  expect(postState(base, NOW)).toBe("live");
  expect(postState({ ...base, publish_from: "2026-12-25T00:00:00Z" }, NOW)).toBe("scheduled");
  expect(postState({ ...base, publish_from: "2026-12-01T00:00:00Z" }, NOW)).toBe("live");
  expect(postState({ ...base, publish_until: "2026-12-24T12:00:00Z" }, NOW)).toBe("ended");
  expect(postState({ ...base, publish_until: "2027-01-01T00:00:00Z" }, NOW)).toBe("live");
  // Unpublished wins over any schedule.
  expect(postState({ ...base, is_published: false, publish_from: "2026-01-01T00:00:00Z" }, NOW)).toBe("draft");
});

test("drafts hold page content only, never settings about the page", () => {
  const picked = pickDraftFields({
    title: "T",
    body: "<p>x</p>",
    tags: ["Alpha"],
    hide_from_search: true,
    publish_from: "2026-12-25T00:00:00Z",
    is_published: true,
  });
  expect(picked).toEqual({ title: "T", body: "<p>x</p>" });
  for (const key of ["tags", "hide_from_search", "publish_from", "publish_until", "is_published"]) {
    expect(DRAFT_FIELDS as readonly string[]).not.toContain(key);
  }
});

test("schedule times are validated and normalised", () => {
  const ok = parsePageSettings({ publish_from: "2026-12-25T09:00:00+00:00", publish_until: "" });
  expect(ok).toEqual({ ok: true, fields: { publish_from: "2026-12-25T09:00:00.000Z", publish_until: null } });
  expect(parsePageSettings({ publish_from: "not a date" }).ok).toBe(false);
  expect(
    parsePageSettings({ publish_from: "2026-12-25T09:00:00Z", publish_until: "2026-12-25T08:00:00Z" }).ok,
  ).toBe(false);
});
