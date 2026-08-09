import { test, expect } from "@playwright/test";
import {
  WELCOME_OPTIONS,
  WELCOME_VERSION,
  decideWelcome,
  isHomepage,
} from "../../lib/welcomeOverlay";

/**
 * The welcome overlay is the first thing a new visitor meets, and the two ways
 * it can go wrong are both invisible in a screenshot: showing to someone who
 * arrived on a deep link with intent, or showing twice in one session. These
 * pin down every branch of that decision.
 */

const base = {
  pathname: "/",
  entryPathname: "/" as string | null,
  stored: null as string | null,
  consentResolved: true,
};

test("opens on a homepage entry once the cookie banner is answered", () => {
  expect(decideWelcome(base)).toBe("show");
});

test("a session that has already seen it is done", () => {
  expect(decideWelcome({ ...base, stored: WELCOME_VERSION })).toBe("suppress");
});

test("a stale marker from an older set of options shows the new one", () => {
  expect(decideWelcome({ ...base, stored: "0" })).toBe("show");
});

test("entering on a deep link suppresses it for the whole session", () => {
  expect(
    decideWelcome({ ...base, pathname: "/give", entryPathname: "/give" }),
  ).toBe("suppress");
});

test("a deep-link entry stays suppressed after hopping to the homepage", () => {
  expect(decideWelcome({ ...base, pathname: "/", entryPathname: "/give" })).toBe(
    "suppress",
  );
});

test("a homepage entry that has navigated away waits rather than burns the session", () => {
  expect(
    decideWelcome({ ...base, pathname: "/sermons", entryPathname: "/" }),
  ).toBe("wait");
});

test("waits for the cookie banner rather than burying it", () => {
  expect(decideWelcome({ ...base, consentResolved: false })).toBe("wait");
});

test("an unrecorded entry path falls back to where the visitor is now", () => {
  expect(decideWelcome({ ...base, entryPathname: null })).toBe("show");
  expect(
    decideWelcome({ ...base, pathname: "/give", entryPathname: null }),
  ).toBe("wait");
});

test("a trailing slash is still the homepage", () => {
  expect(isHomepage("/")).toBe(true);
  expect(isHomepage("//")).toBe(true);
  expect(isHomepage("")).toBe(true);
  expect(isHomepage("/give")).toBe(false);
  expect(isHomepage("/give/")).toBe(false);
  expect(
    decideWelcome({ ...base, pathname: "/", entryPathname: "/give/" }),
  ).toBe("suppress");
});

test("every option points at a real internal route, exactly once", () => {
  expect(WELCOME_OPTIONS).toHaveLength(5);

  for (const option of WELCOME_OPTIONS) {
    expect(option.href.startsWith("/")).toBe(true);
    expect(option.title.length).toBeGreaterThan(0);
    expect(option.icon.length).toBeGreaterThan(0);
  }

  const hrefs = WELCOME_OPTIONS.map((o) => o.href);
  expect(new Set(hrefs).size).toBe(hrefs.length);

  // Exactly one card spans the grid, or the 2x2 below it breaks.
  expect(WELCOME_OPTIONS.filter((o) => o.featured)).toHaveLength(1);
});
