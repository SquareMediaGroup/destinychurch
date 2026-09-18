/**
 * The facts a first-time visitor actually needs — address, phone, service
 * schedule, parking, accessibility — in one typed place.
 *
 * Before this, the same handful of facts were retyped independently in the
 * JSON-LD in app/layout.tsx, the "When & Where" cards on app/visit, the
 * address block on app/contact, an FAQ answer on app/help, and the prose
 * CHURCH_FACTS block in lib/siteKnowledge.ts (which the Smart Search chat
 * reads from). They had already drifted: the JSON-LD Organization schema
 * listed "hello@destinytees.uk" while every other page on the site —
 * contact, terms, safeguarding, jobs, hire, and CHURCH_FACTS itself — uses
 * "admin@destinytees.uk". That drift is exactly what one module fixes.
 *
 * This intentionally does NOT absorb the charity/company registration
 * numbers, leadership names, or mission statement out of CHURCH_FACTS —
 * those live on /governance and in the "who we are" parts of
 * siteKnowledge.ts, which is a different kind of fact with a different
 * canonical source (the Charity Commission / Companies House registers, not
 * this file). This is scoped to "when, where, what to expect."
 *
 * Service times are also available as computed logic in lib/serviceTimes.ts
 * (next service instant, countdown formatting, London/BST-aware). That file
 * owns the *math*; this one owns the *facts* the math and the copy both
 * quote — SERVICE_START_HOUR here matches SERVICE_START_HOUR there by
 * convention, not by import, because serviceTimes.ts is deliberately
 * dependency-free (see its own header comment).
 */

export const CHURCH_NAME = "Destiny Church Tees Valley";

export const ADDRESS = {
  venue: "Destiny Centre",
  street: "395 Norton Road",
  /** Shorter form used in tighter UI (cards, the footer). */
  streetShort: "395 Norton Rd",
  locality: "Stockton-on-Tees",
  region: "Teesside",
  postcode: "TS20 2QQ",
  country: "GB",
  countryName: "United Kingdom",
} as const;

/** One line, the form used in running prose and meta descriptions. */
export const ADDRESS_ONE_LINE = `${ADDRESS.venue}, ${ADDRESS.street}, ${ADDRESS.locality}, ${ADDRESS.postcode}`;

/** Two lines, the form used in address blocks (footer, contact card). */
export const ADDRESS_LINES = [
  ADDRESS.venue,
  ADDRESS.street,
  `${ADDRESS.locality}, ${ADDRESS.postcode}`,
] as const;

export const GEO = {
  latitude: 54.5778,
  longitude: -1.3197,
} as const;

export const MAPS_URL = `https://maps.google.com/maps?q=${encodeURIComponent(
  `${ADDRESS.venue}, ${ADDRESS.street}, ${ADDRESS.locality} ${ADDRESS.postcode}`,
)}`;

/**
 * A driving-directions link, as distinct from MAPS_URL's embeddable search —
 * some call sites (a "Get directions" button) want the app to open in
 * navigation mode rather than showing a pin.
 */
export const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
  `${ADDRESS.venue}, ${ADDRESS.street}, ${ADDRESS.locality} ${ADDRESS.postcode}`,
)}`;

export const PHONE = {
  display: "01642 559797",
  href: "tel:01642559797",
  /** International format, for JSON-LD's `telephone`. */
  e164: "+44-1642-559797",
} as const;

/**
 * The one address used everywhere the public site asks a visitor to get in
 * touch. See the header comment above for the "hello@" drift this replaces.
 */
export const EMAIL = "admin@destinytees.uk";

/**
 * Sunday schedule, in the church's own local wall-clock time. Kept as plain
 * strings for display — lib/serviceTimes.ts does the timezone-correct math
 * for "when is the next one" using its own SERVICE_START_HOUR = 11.
 */
export const SCHEDULE = {
  doorsOpen: "9:45am",
  prayerServiceStart: "10:00am",
  prayerServiceEnd: "10:30am",
  kidsCheckIn: "10:45am",
  mainServiceStart: "11:00am",
  mainServiceEnd: "12:30pm",
  mainServiceDurationMinutes: 90,
  /**
   * 24-hour equivalents, for JSON-LD and anything else that needs ISO-ish
   * times rather than display strings. Kept alongside rather than derived by
   * parsing the display strings above — six literals is simpler than a
   * "10:45am" parser, and these change about as often as the church's actual
   * service times do.
   */
  iso: {
    doorsOpen: "09:45",
    prayerServiceStart: "10:00",
    prayerServiceEnd: "10:30",
    kidsCheckIn: "10:45",
    mainServiceStart: "11:00",
    mainServiceEnd: "12:30",
  },
} as const;

/** Reassurances that belong next to any mention of the Sunday schedule. */
export const VISIT_FACTS = [
  "Free on-site parking",
  "Step-free access",
  "BSL interpretation available",
  "Kids provision from 10:45am",
] as const;

export const ACCESSIBILITY = {
  stepFree: true,
  accessibleToilets: true,
  bslInterpretation: true,
  hearingLoop: true,
} as const;

export const PARKING_NOTE =
  "Free parking is available on site at Destiny Centre. There's plenty of space, and our Welcome Team will be happy to point you in the right direction.";

export const BUS_NOTE = "Several bus routes stop nearby on Norton Road.";

/**
 * A short, render-ready summary for anywhere that wants "when + where" in one
 * sentence (a hero subtitle, a meta description) without composing it from
 * the parts above by hand.
 */
export const VISIT_SUMMARY = `Sundays, doors ${SCHEDULE.doorsOpen} · Main service ${SCHEDULE.mainServiceStart}–${SCHEDULE.mainServiceEnd} · ${ADDRESS.venue}, ${ADDRESS.street}, ${ADDRESS.locality}`;
