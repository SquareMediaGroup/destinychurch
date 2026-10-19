// The probes behind every component on the page. Each one is a plain HTTP
// request from this app (its own Vercel project, no Supabase client), so the
// page keeps rendering whatever else is down. A probe never throws: a timeout
// or network error is a "down" result with a reason.

export type Level = "operational" | "degraded" | "down" | "unknown";

export interface ProbeResult {
  level: Level;
  /** Short, member-readable reason when not operational. */
  detail: string | null;
  /** Round-trip time of our own HTTP probes; null for provider status reads. */
  ms: number | null;
}

const TIMEOUT_MS = 8_000;
/** A response slower than this still counts as up, but degraded. */
const SLOW_MS = 4_000;

export const SITE_URL = (process.env.STATUS_SITE_URL || "https://destinytees.uk").replace(/\/$/, "");
const SUPABASE_URL = process.env.STATUS_SUPABASE_URL?.replace(/\/$/, "") || null;
const SUPABASE_KEY = process.env.STATUS_SUPABASE_PUBLISHABLE_KEY || null;

async function timedFetch(url: string, init?: RequestInit): Promise<{ res: Response | null; ms: number; error: string | null }> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      ...init,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "DestinyStatus/1.0 (+https://status.destinytees.uk)", ...init?.headers },
    });
    return { res, ms: Date.now() - started, error: null };
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { res: null, ms: Date.now() - started, error: timedOut ? "Not responding" : "Can't be reached" };
  }
}

function fromHttp(res: Response | null, ms: number, error: string | null): ProbeResult {
  if (!res) return { level: "down", detail: error, ms };
  if (res.status >= 500) return { level: "down", detail: `Server error (${res.status})`, ms };
  if (!res.ok) return { level: "down", detail: `Unexpected response (${res.status})`, ms };
  if (ms > SLOW_MS) return { level: "degraded", detail: "Responding slowly", ms };
  return { level: "operational", detail: null, ms };
}

/** GET a page or route on the website and expect a 2xx. */
export async function probeSite(path: string): Promise<ProbeResult> {
  const { res, ms, error } = await timedFetch(`${SITE_URL}${path}`);
  return fromHttp(res, ms, error);
}

/**
 * The website's own health route (GET /api/health). It answers 200 with the
 * state of its dependencies in the body, so one request covers the database
 * and Smart Search.
 */
export interface SiteHealth {
  reachable: ProbeResult;
  database: ProbeResult;
  smartSearch: ProbeResult;
}

export async function probeSiteHealth(): Promise<SiteHealth> {
  const { res, ms, error } = await timedFetch(`${SITE_URL}/api/health`);
  const reachable = fromHttp(res, ms, error);
  const unknown: ProbeResult = { level: "unknown", detail: "Website health check unavailable", ms: null };
  if (!res || !res.ok) return { reachable, database: unknown, smartSearch: unknown };

  let body: { database?: string; smartSearch?: string } = {};
  try {
    body = await res.json();
  } catch {
    return { reachable, database: unknown, smartSearch: unknown };
  }

  const database: ProbeResult =
    body.database === "ok"
      ? { level: "operational", detail: null, ms: null }
      : body.database === "slow"
        ? { level: "degraded", detail: "Database responding slowly", ms: null }
        : { level: "down", detail: "Database can't be reached", ms: null };

  const smartSearch: ProbeResult =
    body.smartSearch === "ok"
      ? { level: "operational", detail: null, ms: null }
      : body.smartSearch === "off"
        ? { level: "down", detail: "Paused after a failed check", ms: null }
        : { level: "unknown", detail: null, ms: null };

  return { reachable, database, smartSearch };
}

/** Supabase Auth's public health endpoint, which Destiny One signs in through. */
export async function probeSupabaseAuth(): Promise<ProbeResult> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { level: "unknown", detail: null, ms: null };
  const { res, ms, error } = await timedFetch(`${SUPABASE_URL}/auth/v1/health`, {
    headers: { apikey: SUPABASE_KEY },
  });
  return fromHttp(res, ms, error);
}

// Providers publish their own status on Atlassian Statuspage, which has a
// public JSON API. We read it rather than guess: realtime, file storage and
// push delivery have no cheap public probe of our own. Used only as an input
// to our components; the page never names the providers.

interface StatuspageSummary {
  status?: { indicator?: string; description?: string };
  components?: { name: string; status: string }[];
}

const PROVIDER_PAGES = {
  supabase: "https://status.supabase.com",
  expo: "https://status.expo.dev",
} as const;

export type Provider = keyof typeof PROVIDER_PAGES;

function fromComponentStatus(status: string): Level {
  switch (status) {
    case "operational":
      return "operational";
    case "degraded_performance":
    case "under_maintenance":
      return "degraded";
    case "partial_outage":
    case "major_outage":
      return "down";
    default:
      return "unknown";
  }
}

function fromIndicator(indicator: string | undefined): Level {
  switch (indicator) {
    case "none":
      return "operational";
    case "minor":
    case "maintenance":
      return "degraded";
    case "major":
    case "critical":
      return "down";
    default:
      return "unknown";
  }
}

export interface ProviderStatus {
  overall: ProbeResult;
  /** Look up one named component; falls back to the overall status. */
  component(name: string): ProbeResult;
}

export async function probeProvider(provider: Provider): Promise<ProviderStatus> {
  const { res } = await timedFetch(`${PROVIDER_PAGES[provider]}/api/v2/summary.json`);
  let summary: StatuspageSummary | null = null;
  if (res?.ok) {
    try {
      summary = await res.json();
    } catch {
      summary = null;
    }
  }

  // Can't read the provider's page: say so, never report their outage.
  if (!summary) {
    const unknown: ProbeResult = { level: "unknown", detail: null, ms: null };
    return { overall: unknown, component: () => unknown };
  }

  const overallLevel = fromIndicator(summary.status?.indicator);
  const overall: ProbeResult = {
    level: overallLevel,
    detail: overallLevel === "operational" ? null : "Some members may be affected",
    ms: null,
  };

  return {
    overall,
    component(name) {
      const match = summary?.components?.find((c) => c.name.toLowerCase() === name.toLowerCase());
      if (!match) return overall;
      const level = fromComponentStatus(match.status);
      return { level, detail: level === "operational" ? null : "Some members may be affected", ms: null };
    },
  };
}
