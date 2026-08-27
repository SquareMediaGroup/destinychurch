// The "Whole site" tab on /admin/analytics — a thin, defensive wrapper over
// Vercel's Web Analytics REST API (public since May 2026), which reads the
// same aggregated data the Vercel dashboard itself shows.
//
// Deliberately not Google Analytics: @vercel/analytics is already installed
// and already consent-gated (components/AnalyticsGate.tsx), so this reads
// data that's already being collected rather than standing up a second
// tracker, a second consent story and a second privacy-policy paragraph.
//
// The one thing this file exists to get right: it must NEVER present an empty
// chart. The church's Vercel plan isn't knowable from inside the app, and the
// plan decides whether a 90-day query is even answerable — Hobby's reporting
// window is one month, Pro's is twelve. An empty chart could mean "nobody
// visited" or "your plan can't answer that", and those need to look different
// on screen. Every path through this file either returns real numbers or says
// in plain words why it can't.

import "server-only";

const BASE = "https://api.vercel.com/v1/query/web-analytics";
const TIMEOUT_MS = 8000;
/** Vercel's fetch cache TTL. This data moves slowly and the API has its own
 * rate limits; five minutes keeps the admin page snappy without hammering it. */
const REVALIDATE_SECONDS = 300;

export interface SiteBucket {
  key: string;
  pageviews: number;
  visitors: number;
}

export interface SitePanelData {
  totals: { pageviews: number; visitors: number };
  byDay: SiteBucket[];
  byRoute: SiteBucket[];
  byCountry: SiteBucket[];
  byDevice: SiteBucket[];
  byReferrer: SiteBucket[];
  /** Dimensions that failed independently — shown as "couldn't load X" rather
   * than silently missing from the page. */
  partial: string[];
}

export type VercelAnalyticsResult =
  | { ok: true; data: SitePanelData }
  | { ok: false; reason: "not-configured"; missing: string[] }
  | { ok: false; reason: "auth" | "plan" | "error"; message: string };

function config() {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_ANALYTICS_PROJECT_ID;
  const teamId = process.env.VERCEL_ANALYTICS_TEAM_ID || null;
  const missing: string[] = [];
  if (!token) missing.push("VERCEL_API_TOKEN");
  if (!projectId) missing.push("VERCEL_ANALYTICS_PROJECT_ID");
  return { token, projectId, teamId, missing };
}

/** YYYY-MM-DD — the only format the API's since/until accept. */
function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

interface CountResponse {
  data: { pageviews: number; visitors: number };
}
interface AggregateResponse {
  data: Record<string, unknown>[];
}

async function query<T>(
  path: string,
  token: string,
  params: Record<string, string | undefined>,
): Promise<T> {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);

  const res = await fetch(`${BASE}/${path}?${search.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    // Vercel's error body is { error: { code, message } } with a message
    // already phrased for a human ("not available on your plan"), so it's
    // surfaced verbatim rather than replaced with a guess.
    const body = (await res.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    const message = body?.error?.message || `Vercel API returned ${res.status}`;
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  return (await res.json()) as T;
}

/** Every `by` dimension's group field is named after itself, except `day`,
 * which comes back as an ISO `timestamp`. */
const GROUP_FIELD: Record<string, string> = {
  day: "timestamp",
  route: "route",
  country: "country",
  deviceType: "deviceType",
  referrerHostname: "referrerHostname",
};

function toBuckets(rows: Record<string, unknown>[], by: string): SiteBucket[] {
  const field = GROUP_FIELD[by] ?? by;
  return rows.map((row) => {
    const raw = row[field];
    const key =
      by === "day" && typeof raw === "string"
        ? raw.slice(0, 10)
        : typeof raw === "string"
          ? raw
          : String(raw ?? "unknown");
    return {
      key,
      pageviews: Number(row.pageviews ?? 0),
      visitors: Number(row.visitors ?? 0),
    };
  });
}

export async function fetchSitePanel(since: Date, until: Date): Promise<VercelAnalyticsResult> {
  const { token, projectId, teamId, missing } = config();
  if (missing.length > 0 || !token || !projectId) {
    return { ok: false, reason: "not-configured", missing };
  }

  const base = { projectId, teamId: teamId ?? undefined, since: day(since), until: day(until) };

  const dims: { by: string; limit: string }[] = [
    { by: "day", limit: "400" },
    { by: "route", limit: "10" },
    { by: "country", limit: "10" },
    { by: "deviceType", limit: "6" },
    { by: "referrerHostname", limit: "10" },
  ];

  const [totalsResult, ...dimResults] = await Promise.allSettled([
    query<CountResponse>("visits/count", token, base),
    ...dims.map(({ by, limit }) =>
      query<AggregateResponse>("visits/aggregate", token, { ...base, by, limit }),
    ),
  ]);

  // If even the totals call fails, treat the whole panel as unreachable — a
  // page of empty breakdowns under a missing headline number reads as broken,
  // not as "some data unavailable".
  if (totalsResult.status === "rejected") {
    const err = totalsResult.reason as Error & { status?: number };
    return {
      ok: false,
      reason: err.status === 401 || err.status === 403 ? "auth" : "plan",
      message: err.message,
    };
  }

  const partial: string[] = [];
  const bucketsFor = (i: number, by: string): SiteBucket[] => {
    const r = dimResults[i];
    if (r.status === "fulfilled") return toBuckets(r.value.data ?? [], by);
    partial.push(by);
    return [];
  };

  return {
    ok: true,
    data: {
      totals: totalsResult.value.data,
      byDay: bucketsFor(0, "day"),
      byRoute: bucketsFor(1, "route"),
      byCountry: bucketsFor(2, "country"),
      byDevice: bucketsFor(3, "deviceType"),
      byReferrer: bucketsFor(4, "referrerHostname"),
      partial,
    },
  };
}
