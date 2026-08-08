import { test, expect } from "@playwright/test";
import {
  COURSE_ADMIN_PAGES,
  COURSE_EVENT_META,
  COURSE_EVENT_TYPES,
  COURSE_EVENT_TYPES_SQL,
  hexToRgb,
  isCourseEventType,
  type CourseEventType,
} from "../../lib/courseEvents";

/**
 * Integrity checks for the course registry.
 *
 * /admin/alpha, /admin/recovery, /admin/bible-course and /admin/cap-money are
 * now four four-line files over one shared component, so everything that used
 * to be visible in each page — its accent, its banner copy, which types it
 * owns — is data in here. A missing or duplicated entry no longer shows up as
 * a compile error in the page; it shows up as a blank heading or a course that
 * silently manages the wrong events. These are the checks that catch that.
 */

test("every course type has complete metadata", () => {
  for (const type of COURSE_EVENT_TYPES) {
    const meta = COURSE_EVENT_META[type];
    expect(meta, `${type} has no metadata`).toBeDefined();
    expect(meta.label.length, `${type} label`).toBeGreaterThan(0);
    expect(meta.href.startsWith("/"), `${type} href must be site-relative`).toBe(
      true,
    );
    expect(meta.color, `${type} colour must be a hex triplet`).toMatch(
      /^#[0-9a-f]{6}$/i,
    );
    expect(meta.hint.length, `${type} hint`).toBeGreaterThan(0);
    expect(meta.eventsLabel.length, `${type} eventsLabel`).toBeGreaterThan(0);
    expect(meta.bannerLinkText.length, `${type} bannerLinkText`).toBeGreaterThan(
      0,
    );
    // bannerMessage is intentionally allowed to be empty — Alpha posts "" so
    // its banner falls back to the eyebrow. Only assert it is a string.
    expect(typeof meta.bannerMessage).toBe("string");
  }
});

test("course types are unique", () => {
  expect(new Set(COURSE_EVENT_TYPES).size).toBe(COURSE_EVENT_TYPES.length);
});

test("every admin page owns at least one type, and no type is owned twice", () => {
  const owners = new Map<CourseEventType, string>();

  for (const [slug, page] of Object.entries(COURSE_ADMIN_PAGES)) {
    expect(page.types.length, `${slug} owns no types`).toBeGreaterThan(0);
    expect(page.heading.length, `${slug} heading`).toBeGreaterThan(0);
    expect(page.blurb.length, `${slug} blurb`).toBeGreaterThan(0);
    expect(page.promoteHeading.length, `${slug} promoteHeading`).toBeGreaterThan(0);
    expect(page.promoteHelp.length, `${slug} promoteHelp`).toBeGreaterThan(0);
    expect(page.accent, `${slug} accent must be a hex triplet`).toMatch(
      /^#[0-9a-f]{6}$/i,
    );

    for (const type of page.types) {
      expect(isCourseEventType(type), `${slug} lists unknown type ${type}`).toBe(
        true,
      );
      expect(
        owners.get(type),
        `${type} is managed by both ${owners.get(type)} and ${slug}`,
      ).toBeUndefined();
      owners.set(type, slug);
    }
  }
});

test("every course type is reachable from some admin page", () => {
  const owned = new Set(
    Object.values(COURSE_ADMIN_PAGES).flatMap((p) => [...p.types]),
  );
  for (const type of COURSE_EVENT_TYPES) {
    expect(owned.has(type), `${type} has no admin page`).toBe(true);
  }
});

test("isCourseEventType accepts every type and rejects everything else", () => {
  for (const type of COURSE_EVENT_TYPES) {
    expect(isCourseEventType(type)).toBe(true);
  }
  for (const value of ["", "Alpha", "sermon", null, undefined, 3, {}]) {
    expect(isCourseEventType(value)).toBe(false);
  }
});

test("the PostgREST type list is a parenthesised CSV of every type", () => {
  expect(COURSE_EVENT_TYPES_SQL.startsWith("(")).toBe(true);
  expect(COURSE_EVENT_TYPES_SQL.endsWith(")")).toBe(true);
  expect(COURSE_EVENT_TYPES_SQL.slice(1, -1).split(",")).toEqual([
    ...COURSE_EVENT_TYPES,
  ]);
});

test("hexToRgb matches the values the admin pages used to hardcode", () => {
  // These were the ACCENT_RGB constants in the four pages before they merged.
  expect(hexToRgb("#4e7d14")).toBe("78,125,20");
  expect(hexToRgb("#1b4965")).toBe("27,73,101");
  expect(hexToRgb("#006756")).toBe("0,103,86");
  expect(hexToRgb("#f58021")).toBe("245,128,33");
});

test("hexToRgb handles shorthand and missing hashes", () => {
  expect(hexToRgb("#fff")).toBe("255,255,255");
  expect(hexToRgb("000")).toBe("0,0,0");
  expect(hexToRgb("#000000")).toBe("0,0,0");
});
