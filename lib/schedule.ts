// Time windows on content: "show from X until Y".
//
// Client-safe. Used by the public layout (banner, popup) and the admin banner
// and popup pages. A null bound means "no limit on that side", so a row
// that has never been scheduled is always inside its window.

export interface ScheduleWindow {
  starts_at?: string | null;
  ends_at?: string | null;
}

/** Whether `now` falls inside the row's window. Bad dates count as no limit. */
export function isWithinWindow(row: ScheduleWindow, now = Date.now()): boolean {
  const start = row.starts_at ? new Date(row.starts_at).getTime() : NaN;
  const end = row.ends_at ? new Date(row.ends_at).getTime() : NaN;
  if (!Number.isNaN(start) && now < start) return false;
  if (!Number.isNaN(end) && now >= end) return false;
  return true;
}

export type WindowState = "off" | "scheduled" | "live" | "ended";

/** Where an on/off + windowed row stands right now. */
export function windowState(
  row: ScheduleWindow & { active?: boolean | null },
  now = Date.now(),
): WindowState {
  if (!row.active) return "off";
  if (row.starts_at && new Date(row.starts_at).getTime() > now) return "scheduled";
  if (row.ends_at && new Date(row.ends_at).getTime() <= now) return "ended";
  return "live";
}

type Parsed = { ok: true; value: string | null } | { ok: false; error: string };

/**
 * Normalise one bound from a request body: undefined stays undefined (the
 * caller leaves the column alone), "" or null clears it, anything else must be
 * a real date and comes back as ISO.
 */
export function parseBound(value: unknown): Parsed | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, error: "That date and time isn't valid." };
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return { ok: false, error: "That date and time isn't valid." };
  return { ok: true, value: when.toISOString() };
}

/**
 * Reads `starts_at` / `ends_at` from a request body. Only keys that were sent
 * are returned, so a save from a page that doesn't know about scheduling
 * leaves an existing window alone.
 */
export function parseWindow(
  body: Record<string, unknown>,
): { ok: true; fields: ScheduleWindow } | { ok: false; error: string } {
  const fields: ScheduleWindow = {};
  for (const key of ["starts_at", "ends_at"] as const) {
    const parsed = parseBound(body[key]);
    if (!parsed) continue;
    if (!parsed.ok) return parsed;
    fields[key] = parsed.value;
  }
  if (fields.starts_at && fields.ends_at && fields.ends_at <= fields.starts_at) {
    return { ok: false, error: "The end time must be after the start time." };
  }
  return { ok: true, fields };
}

/* ── UK time ─────────────────────────────────────────────────────────────── */

// The church runs on UK time but the database stores UTC, so anything shown
// to a person is formatted back in London time, whichever side of a GMT/BST
// change it falls on.

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

/** "from Fri 6 Nov, 12:00 until Fri 6 Nov, 15:00", or the half that applies. */
export function describeWindow(starts: string | null | undefined, ends: string | null | undefined): string {
  if (starts && ends) return `from ${formatLondon(starts)} until ${formatLondon(ends)}`;
  if (starts) return `from ${formatLondon(starts)}, with no end time`;
  if (ends) return `straight away until ${formatLondon(ends)}`;
  return "straight away, with no end time";
}
