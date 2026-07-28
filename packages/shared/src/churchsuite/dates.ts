// Date handling for the ChurchSuite calendar feed.
//
// The feed sends naive Europe/London wall-clock timestamps in the form
// "2026-07-30 00:00:00" — a space, not the "T" that ES5 Date parsing requires.
// Chrome tolerates it; Safari returns Invalid Date. Every read of a feed
// timestamp must go through `parseFeedDate` so that fix lives in one place.

import type { ChurchSuiteEvent } from "./events";

/**
 * Parse a feed timestamp. The "T" swap is the Safari fix; without it
 * `new Date("2026-07-30 00:00:00")` is Invalid Date on WebKit.
 */
export function parseFeedDate(value: string): Date {
  return new Date(value.replace(" ", "T"));
}

/**
 * Is this event still worth showing?
 *
 * Compares against `datetime_end`, not `datetime_start`, so a multiday event
 * that has already begun (a three-day conference on day two) stays visible
 * rather than vanishing the morning it starts.
 */
export function isUpcoming(
  event: Pick<ChurchSuiteEvent, "datetime_end">,
  now: number = Date.now(),
): boolean {
  return parseFeedDate(event.datetime_end).getTime() >= now;
}

/** Does the event span more than one calendar day? */
export function isMultiday(
  event: Pick<ChurchSuiteEvent, "datetime_start" | "datetime_end">,
): boolean {
  return (
    parseFeedDate(event.datetime_start).toDateString() !==
    parseFeedDate(event.datetime_end).toDateString()
  );
}

/** Sort comparator: earliest start first. */
export function byStart(
  a: Pick<ChurchSuiteEvent, "datetime_start">,
  b: Pick<ChurchSuiteEvent, "datetime_start">,
): number {
  return (
    parseFeedDate(a.datetime_start).getTime() -
    parseFeedDate(b.datetime_start).getTime()
  );
}

/** "2026-08" — stable grouping key, sorts lexicographically by month. */
export function monthKey(value: string): string {
  const d = parseFeedDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "August 2026" — the heading shown above each month's cards. */
export function monthLabel(value: string): string {
  return parseFeedDate(value).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/**
 * The card's kicker line: "WED 5 AUG · 10:00 AM", or "THU 30 JUL – SAT 1 AUG"
 * when the event spans days (the time is meaningless across a multiday range).
 */
export function formatKicker(
  event: Pick<ChurchSuiteEvent, "datetime_start" | "datetime_end">,
): string {
  const start = parseFeedDate(event.datetime_start);
  const short = (d: Date) =>
    d
      .toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
      .toUpperCase()
      .replace(/,/g, "");

  if (isMultiday(event)) {
    return `${short(start)} – ${short(parseFeedDate(event.datetime_end))}`;
  }
  const time = start
    .toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })
    .toUpperCase();
  return `${short(start)} · ${time}`;
}

/** Day-of-month and short month, for the no-artwork fallback panel. */
export function formatDayChip(value: string): { day: string; month: string } {
  const d = parseFeedDate(value);
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString("en-GB", { month: "short" }).toUpperCase(),
  };
}

/** The long form used on the detail page: full weekday, date and time range. */
export function formatDateRange(
  event: Pick<ChurchSuiteEvent, "datetime_start" | "datetime_end">,
): string {
  const start = parseFeedDate(event.datetime_start);
  const end = parseFeedDate(event.datetime_end);
  const date = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const time = (d: Date) =>
    d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });

  if (isMultiday(event)) return `${date(start)} – ${date(end)}`;
  return `${date(start)}, ${time(start)} – ${time(end)}`;
}

/** Just the time range, for session lists where the date is already shown. */
export function formatTimeRange(
  event: Pick<ChurchSuiteEvent, "datetime_start" | "datetime_end">,
): string {
  const time = (value: string) =>
    parseFeedDate(value).toLocaleTimeString("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  return `${time(event.datetime_start)} – ${time(event.datetime_end)}`;
}
