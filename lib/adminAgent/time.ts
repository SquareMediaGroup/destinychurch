// Times for DestinyAI. Client-safe.
//
// The church runs on UK time and so do the people asking ("12–3pm tomorrow"),
// but the database stores UTC. The model is told the current London time with
// its offset and must hand back ISO 8601 with an offset; everything shown to a
// person is formatted back in London time, so whoever confirms a plan reads
// the times they meant, whichever side of a GMT/BST change it falls on.

export const CHURCH_TIME_ZONE = "Europe/London";

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: CHURCH_TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "Fri 6 Nov, 12:00" in London time. */
export function formatLondon(iso: string | null | undefined): string {
  if (!iso) return "";
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return "";
  return DATE_TIME.format(when);
}

/** The UTC offset London is on at that moment, e.g. "+00:00" or "+01:00". */
export function londonOffset(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CHURCH_TIME_ZONE,
    timeZoneName: "longOffset",
  }).formatToParts(at);
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const match = name.match(/GMT([+-]\d{2}):?(\d{2})?/);
  return match ? `${match[1]}:${match[2] ?? "00"}` : "+00:00";
}

/** The wall-clock London time as ISO with its offset: "2026-11-05T14:03:00+00:00". */
export function londonIso(at: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: CHURCH_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}${londonOffset(at)}`;
}

/** The weekday name in London ("Thursday"), which the model needs to resolve "on Sunday". */
export function londonWeekday(at: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: CHURCH_TIME_ZONE, weekday: "long" }).format(at);
}

/** "from Fri 6 Nov, 12:00 until Fri 6 Nov, 15:00", or the half that applies. */
export function describeWindow(starts: string | null | undefined, ends: string | null | undefined): string {
  if (starts && ends) return `from ${formatLondon(starts)} until ${formatLondon(ends)}`;
  if (starts) return `from ${formatLondon(starts)}, with no end time`;
  if (ends) return `straight away until ${formatLondon(ends)}`;
  return "straight away, with no end time";
}

/**
 * Checks a time the model produced. It must parse, carry an explicit offset
 * (otherwise "12:00" means whatever timezone the server is in), and not be in
 * the past by more than a few minutes, which is almost always a wrong day.
 */
export function checkFutureTime(
  value: string,
  now = Date.now(),
  { allowPast = false }: { allowPast?: boolean } = {},
): { ok: true; iso: string } | { ok: false; error: string } {
  if (!/(Z|[+-]\d{2}:?\d{2})$/.test(value.trim())) {
    return { ok: false, error: `"${value}" has no timezone offset. Use ISO 8601 with the London offset.` };
  }
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return { ok: false, error: `"${value}" is not a valid date and time.` };
  if (!allowPast && when.getTime() < now - 5 * 60_000) {
    return {
      ok: false,
      error: `${formatLondon(when.toISOString())} is in the past. Check the day, or ask the admin.`,
    };
  }
  return { ok: true, iso: when.toISOString() };
}

/**
 * The start and end of a requested window, checked: both carry an offset, the
 * end is in the future and after the start. When confirming, a start that has
 * just passed is allowed and means "straight away".
 */
export function resolveWindow(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  now: number,
  confirming = false,
): { ok: true; starts: string | null; ends: string | null } | { ok: false; error: string } {
  const starts = startsAt ? checkFutureTime(startsAt, now, { allowPast: confirming }) : null;
  if (starts && !starts.ok) return starts;
  const ends = endsAt ? checkFutureTime(endsAt, now) : null;
  if (ends && !ends.ok) return ends;
  const startIso = starts?.ok ? starts.iso : null;
  const endIso = ends?.ok ? ends.iso : null;
  if (endIso && new Date(endIso).getTime() <= Math.max(now, startIso ? new Date(startIso).getTime() : 0)) {
    return { ok: false, error: "The end time has to be after it starts." };
  }
  return { ok: true, starts: startIso, ends: endIso };
}
