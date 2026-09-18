import { test, expect } from "@playwright/test";
import {
  ADDRESS,
  ADDRESS_LINES,
  ADDRESS_ONE_LINE,
  EMAIL,
  MAPS_URL,
  PHONE,
  SCHEDULE,
} from "../../lib/churchInfo";
import { CHURCH_FACTS } from "../../lib/siteKnowledge";

/**
 * lib/churchInfo.ts exists to stop the address/phone/schedule from drifting
 * across the pages that quote it — they used to be retyped independently in
 * app/layout.tsx's JSON-LD, /visit, /contact, /help and CHURCH_FACTS, and had
 * already drifted (the JSON-LD Organization schema had a different support
 * email than every other page on the site). These pin the internal
 * consistency of the source file itself, and confirm CHURCH_FACTS is really
 * quoting it rather than a hand-typed copy that happens to match today.
 */

test("the display address and ADDRESS_ONE_LINE agree on every field", () => {
  for (const part of [
    ADDRESS.venue,
    ADDRESS.street,
    ADDRESS.locality,
    ADDRESS.postcode,
  ]) {
    expect(ADDRESS_ONE_LINE).toContain(part);
  }
});

test("ADDRESS_LINES covers the same fields as ADDRESS_ONE_LINE", () => {
  const joined = ADDRESS_LINES.join(" ");
  expect(joined).toContain(ADDRESS.venue);
  expect(joined).toContain(ADDRESS.street);
  expect(joined).toContain(ADDRESS.postcode);
});

test("the maps URL is built from the real address, not a stale copy", () => {
  expect(MAPS_URL).toContain(encodeURIComponent(ADDRESS.postcode));
});

test("the Sunday schedule is in chronological order", () => {
  const order = [
    SCHEDULE.iso.doorsOpen,
    SCHEDULE.iso.prayerServiceStart,
    SCHEDULE.iso.prayerServiceEnd,
    SCHEDULE.iso.kidsCheckIn,
    SCHEDULE.iso.mainServiceStart,
    SCHEDULE.iso.mainServiceEnd,
  ];
  const sorted = [...order].sort();
  expect(order).toEqual(sorted);
});

test("the 24-hour schedule times match their display-string hours", () => {
  // e.g. iso.mainServiceStart "11:00" should agree with display "11:00am".
  const pairs: [string, string][] = [
    [SCHEDULE.iso.doorsOpen, SCHEDULE.doorsOpen],
    [SCHEDULE.iso.prayerServiceStart, SCHEDULE.prayerServiceStart],
    [SCHEDULE.iso.prayerServiceEnd, SCHEDULE.prayerServiceEnd],
    [SCHEDULE.iso.kidsCheckIn, SCHEDULE.kidsCheckIn],
    [SCHEDULE.iso.mainServiceStart, SCHEDULE.mainServiceStart],
    [SCHEDULE.iso.mainServiceEnd, SCHEDULE.mainServiceEnd],
  ];

  for (const [iso, display] of pairs) {
    const [h24, m] = iso.split(":").map(Number);
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    const period = h24 < 12 ? "am" : "pm";
    const expected = `${h12}:${String(m).padStart(2, "0")}${period}`;
    expect(display).toBe(expected);
  }
});

test("the support email is admin@destinytees.uk everywhere, not hello@", () => {
  // This is the exact drift that motivated churchInfo.ts: the JSON-LD
  // Organization schema in app/layout.tsx used to say "hello@destinytees.uk"
  // while every other page on the site — /contact, /terms, /safeguarding,
  // /jobs, /hire — uses admin@destinytees.uk.
  expect(EMAIL).toBe("admin@destinytees.uk");
});

test("PHONE's three formats agree with each other", () => {
  const digits = PHONE.display.replace(/\s+/g, "");
  expect(PHONE.href).toBe(`tel:${digits}`);
  expect(PHONE.e164.replace(/[^\d]/g, "")).toBe(`44${digits.replace(/^0/, "")}`);
});

test("CHURCH_FACTS quotes churchInfo rather than a hand-typed copy", () => {
  for (const fact of [
    ADDRESS_ONE_LINE,
    PHONE.display,
    EMAIL,
    SCHEDULE.prayerServiceStart,
    SCHEDULE.mainServiceStart,
    SCHEDULE.doorsOpen,
  ]) {
    expect(CHURCH_FACTS).toContain(fact);
  }
});
