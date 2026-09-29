export type AlphaFrequency =
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "custom"
  | "one_off";

export interface AlphaSessionInfo {
  date: Date;
  isFirst: boolean;
  isPast: boolean;
}

/**
 * All the arithmetic here is on calendar days, represented as local-midnight
 * Dates so callers can format them with plain toLocaleDateString in any
 * timezone and get the same day back.
 *
 * Two traps this avoids (both caused React hydration error #418 on the site
 * banner, and showed US visitors the day before the real session):
 *  - `new Date("2026-09-30")` is UTC midnight, which is 29 September anywhere
 *    west of UTC. A date-only string is parsed as that calendar day instead.
 *  - "today" is the church's day (Europe/London), not the viewer's, so the
 *    server and every browser agree on which session is next.
 */
function calendarDay(y: number, m: number, d: number): Date {
  return new Date(y, m - 1, d);
}

function parseStartDay(startDate: string | Date): Date {
  if (typeof startDate === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate);
    if (match) return calendarDay(+match[1], +match[2], +match[3]);
    startDate = new Date(startDate);
  }
  return new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
}

function londonToday(now: Date): Date {
  // en-CA formats as YYYY-MM-DD.
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" })
    .format(now)
    .split("-")
    .map(Number);
  return calendarDay(y, m, d);
}

export function getNextAlphaSession(
  startDate: string | Date,
  frequency: string | null | undefined,
  customIntervalDays?: number | null,
  now: Date = new Date()
): AlphaSessionInfo {
  const start = parseStartDay(startDate);
  const today = londonToday(now);
  const freq: AlphaFrequency =
    (frequency as AlphaFrequency | null | undefined) || "weekly";

  if (today <= start) {
    return { date: start, isFirst: true, isPast: false };
  }
  if (freq === "one_off") {
    return { date: start, isFirst: true, isPast: true };
  }
  if (freq === "monthly") {
    const next = new Date(start);
    while (next < today) next.setMonth(next.getMonth() + 1);
    return { date: next, isFirst: false, isPast: false };
  }
  const intervalDays =
    freq === "fortnightly"
      ? 14
      : freq === "custom"
      ? Math.max(1, customIntervalDays || 7)
      : 7;
  // Round, not floor: across a clock change a "day" between local midnights
  // is 23 or 25 hours. Stepping by calendar date keeps the same DST safety.
  const dayMs = 86_400_000;
  const elapsed = Math.round((today.getTime() - start.getTime()) / dayMs);
  const cycles = Math.ceil(elapsed / intervalDays);
  const next = calendarDay(
    start.getFullYear(),
    start.getMonth() + 1,
    start.getDate() + cycles * intervalDays
  );
  return { date: next, isFirst: false, isPast: false };
}

export const FREQUENCY_LABEL: Record<AlphaFrequency, string> = {
  weekly: "Weekly",
  fortnightly: "Fortnightly",
  monthly: "Monthly",
  custom: "Custom",
  one_off: "One-off",
};
