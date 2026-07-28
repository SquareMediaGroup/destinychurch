// Building .ics calendar files from ChurchSuite events.
//
// Feed timestamps are naive Europe/London wall clock ("2026-08-05 10:00:00").
// Rather than convert to UTC — which means hand-rolling BST transition dates
// and getting them wrong twice a year — we emit the local time with
// `TZID=Europe/London` and ship a VTIMEZONE block describing the rule. Calendar
// clients do the conversion, correctly, forever.

import { eventDescriptionText, stripEmoji, type ChurchSuiteEvent } from "./events";
import type { EventSeries } from "./series";

/** Escape per RFC 5545 §3.3.11: backslash, semicolon, comma and newlines. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** "2026-08-05 10:00:00" → "20260805T100000" (local, no Z). */
function toLocalStamp(value: string): string {
  return `${value.slice(0, 10).replace(/-/g, "")}T${value.slice(11, 19).replace(/:/g, "")}`;
}

function utcStamp(date: Date): string {
  return `${date.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

// TextEncoder/TextDecoder rather than Buffer: this package is also consumed by
// the Expo app, where Node globals are not guaranteed.
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Fold to 75 octets per RFC 5545 §3.1. Measured in bytes, not characters — a
 * multi-byte character split across the boundary corrupts the line.
 */
function fold(line: string): string {
  const bytes = encoder.encode(line);
  if (bytes.length <= 75) return line;

  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    // First chunk gets 75 octets; continuations lose one to the leading space.
    const limit = parts.length === 0 ? 75 : 74;
    let end = Math.min(start + limit, bytes.length);
    // Back off a byte at a time until the slice ends on a character boundary,
    // so we never cut through a multi-byte sequence.
    while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(decoder.decode(bytes.subarray(start, end)));
    start = end;
  }
  return parts.join("\r\n ");
}

/** Europe/London's BST rule, as calendar clients expect it. */
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/London",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0000",
  "TZOFFSETTO:+0100",
  "TZNAME:BST",
  "DTSTART:19700329T010000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0000",
  "TZNAME:GMT",
  "DTSTART:19701025T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function vevent(
  event: ChurchSuiteEvent,
  series: EventSeries,
  baseUrl: string,
  stamp: string,
): string[] {
  const location = [event.location?.name, event.location?.address]
    .filter(Boolean)
    .join(", ");
  const description = eventDescriptionText(event, 900);

  const lines = [
    "BEGIN:VEVENT",
    `UID:${event.identifier ?? event.id}@destinytees.uk`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Europe/London:${toLocalStamp(event.datetime_start)}`,
    `DTEND;TZID=Europe/London:${toLocalStamp(event.datetime_end)}`,
    `SUMMARY:${escapeText(stripEmoji(event.name))}`,
    `URL:${baseUrl}/whats-on/${series.slug}`,
  ];
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (location) lines.push(`LOCATION:${escapeText(location)}`);
  if (event.location?.latitude != null && event.location?.longitude != null) {
    lines.push(`GEO:${event.location.latitude};${event.location.longitude}`);
  }
  if (event.category?.name) lines.push(`CATEGORIES:${escapeText(event.category.name)}`);
  lines.push("END:VEVENT");
  return lines;
}

/**
 * Build a calendar file for a series. Without `occurrence` every upcoming
 * session becomes its own VEVENT, so subscribing to a recurring event adds the
 * whole run; with it, just that one session.
 */
export function buildIcs({
  series,
  occurrence,
  baseUrl,
  now = new Date(),
}: {
  series: EventSeries;
  occurrence?: string;
  baseUrl: string;
  now?: Date;
}): string {
  const stamp = utcStamp(now);
  const chosen = occurrence
    ? series.occurrences.filter((e) => e.identifier === occurrence)
    : series.occurrences;
  const events = chosen.length > 0 ? chosen : [series.primary];

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Destiny Church Tees Valley//What's On//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONE,
    ...events.flatMap((event) => vevent(event, series, baseUrl, stamp)),
    "END:VCALENDAR",
  ];

  return `${lines.map(fold).join("\r\n")}\r\n`;
}
