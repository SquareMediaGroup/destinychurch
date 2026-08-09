/**
 * Sunday service times, in the church's own timezone.
 *
 * The site is served from UTC infrastructure and read on phones set to any
 * timezone, but "11am" always means 11am in Stockton-on-Tees. Everything here
 * therefore resolves London wall-clock times to real instants rather than
 * trusting the runtime's local zone, and does it with `Intl` alone — no date
 * library, and no hardcoded BST/GMT switchover dates to go stale.
 */

const TZ = "Europe/London";

/** Main gathering: Sunday 11:00–12:30. */
export const SERVICE_START_HOUR = 11;
const SERVICE_END_MINUTES = 12 * 60 + 30;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  hour12: false,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday. */
  weekday: number;
};

function wallClock(ts: number): WallClock {
  const parts = partsFormatter.formatToParts(new Date(ts));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = Number(get("hour"));
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    // Some engines render midnight as "24" under hour12: false.
    hour: hour === 24 ? 0 : hour,
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: WEEKDAYS.indexOf(get("weekday")),
  };
}

/** London's offset from UTC, in minutes, at a given instant. */
function offsetMinutes(ts: number): number {
  const w = wallClock(ts);
  const asIfUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return Math.round((asIfUtc - ts) / 60_000);
}

/** The instant at which London's clocks read the given wall-clock time. */
function londonInstant(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0
): number {
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  // Two passes settle DST: the first guess uses the offset in force at the
  // naive instant, the second re-reads it at the corrected one.
  let ts = naive - offsetMinutes(naive) * 60_000;
  ts = naive - offsetMinutes(ts) * 60_000;
  return ts;
}

/**
 * The start of the next Sunday 11am service. During a Sunday morning — right up
 * to the 12:30 finish — that is today's service, so the page doesn't tell
 * someone watching the stream that the next one is a week away.
 */
export function nextSundayService(from: Date = new Date()): Date {
  const now = from.getTime();
  const today = wallClock(now);

  let daysAhead = (7 - today.weekday) % 7;
  if (daysAhead === 0 && today.hour * 60 + today.minute >= SERVICE_END_MINUTES) {
    daysAhead = 7;
  }

  // Step forward from London noon, not from `now`: noon ± an hour is still the
  // same calendar day, so a DST change can't shunt the result onto Saturday.
  const noon = londonInstant(today.year, today.month, today.day, 12);
  const target = wallClock(noon + daysAhead * 86_400_000);
  return new Date(
    londonInstant(target.year, target.month, target.day, SERVICE_START_HOUR)
  );
}

/** "Sunday 14 September" in London's calendar. */
export function formatServiceDay(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

/**
 * "2 days 4 hours" / "18 minutes" — the coarse-to-fine countdown used on the
 * live page. Returns null once the target has passed.
 */
export function formatCountdown(target: Date, from: Date = new Date()): string | null {
  const ms = target.getTime() - from.getTime();
  if (ms <= 0) return null;

  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

  if (days > 0) return `${plural(days, "day")} ${plural(hours, "hour")}`;
  if (hours > 0) return `${plural(hours, "hour")} ${plural(minutes, "minute")}`;
  return plural(Math.max(minutes, 1), "minute");
}
