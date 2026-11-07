// Incidents posted by Site Admins from the website's /admin/status: outages,
// amber alerts and maintenance, each with a timeline of updates. Read from
// Supabase's REST API with the publishable key (the tables are public-read,
// supabase/migrations/20261019_01_status_incidents.sql).
//
// If Supabase can't be read, the page still renders its automated checks and
// just shows no notices; that read is the only part of this app that depends
// on Supabase. `components` uses the ids from lib/status.ts.

export type NoticeKind = "outage" | "degraded" | "maintenance";

export interface NoticeUpdate {
  body: string;
  author: string | null;
  createdAt: string;
}

export interface Notice {
  id: number;
  title: string;
  kind: NoticeKind;
  components: string[];
  startedAt: string;
  resolvedAt: string | null;
  /** Who posted it (their admin profile name). */
  author: string | null;
  /** Newest first. */
  updates: NoticeUpdate[];
}

export interface Notices {
  active: Notice[];
  /** Resolved in the last 14 days, newest first. */
  resolved: Notice[];
  /** False when Supabase couldn't be read. */
  available: boolean;
}

const SHOW_RESOLVED_FOR_MS = 14 * 24 * 60 * 60_000;
const SUPABASE_URL = process.env.STATUS_SUPABASE_URL?.replace(/\/$/, "") || null;
const SUPABASE_KEY = process.env.STATUS_SUPABASE_PUBLISHABLE_KEY || null;

interface Row {
  id: number;
  title: string;
  kind: NoticeKind;
  components: string[] | null;
  started_at: string;
  resolved_at: string | null;
  author_name: string | null;
  status_incident_updates: { body: string; author_name: string | null; created_at: string }[] | null;
}

export async function getNotices(): Promise<Notices> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return { active: [], resolved: [], available: false };

  const since = new Date(Date.now() - SHOW_RESOLVED_FOR_MS).toISOString();
  const params = new URLSearchParams({
    select: "id,title,kind,components,started_at,resolved_at,author_name,status_incident_updates(body,author_name,created_at)",
    or: `(resolved_at.is.null,resolved_at.gt.${since})`,
    order: "started_at.desc",
    "status_incident_updates.order": "created_at.desc",
  });

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/status_incidents?${params}`, {
      headers: { apikey: SUPABASE_KEY },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return { active: [], resolved: [], available: false };
    const rows = (await res.json()) as Row[];
    const notices: Notice[] = rows.map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.kind,
      components: r.components ?? [],
      startedAt: r.started_at,
      resolvedAt: r.resolved_at,
      author: r.author_name,
      updates: (r.status_incident_updates ?? []).map((u) => ({
        body: u.body,
        author: u.author_name,
        createdAt: u.created_at,
      })),
    }));
    return {
      active: notices.filter((n) => !n.resolvedAt),
      resolved: notices.filter((n) => n.resolvedAt),
      available: true,
    };
  } catch {
    return { active: [], resolved: [], available: false };
  }
}
