// Notices written by a person: an outage explanation, planned maintenance, or a
// resolved incident. Kept in the repo rather than a database so posting one
// never depends on the systems that might be down. Add an entry, merge, and
// Vercel redeploys the page.
//
// `components` uses the ids from lib/status.ts (e.g. "d1-chats", "shop").
// Resolved notices stay on the page for 14 days after `resolvedAt`.

export type NoticeKind = "outage" | "degraded" | "maintenance";

export interface Notice {
  title: string;
  body: string;
  kind: NoticeKind;
  components: string[];
  /** ISO 8601, e.g. "2026-10-19T19:00:00Z". */
  startedAt: string;
  resolvedAt?: string;
}

export const notices: Notice[] = [
  // {
  //   title: "Destiny One messages delayed",
  //   body: "Our database provider is having problems. Messages may be slow to send. We're watching it.",
  //   kind: "degraded",
  //   components: ["d1-chats", "d1-realtime"],
  //   startedAt: "2026-10-19T19:00:00Z",
  // },
];

const SHOW_RESOLVED_FOR_MS = 14 * 24 * 60 * 60_000;

/** Ongoing and upcoming (planned maintenance can start in the future). */
export function activeNotices(): Notice[] {
  return notices.filter((n) => !n.resolvedAt);
}

export function recentResolved(now = Date.now()): Notice[] {
  return notices
    .filter((n) => n.resolvedAt && now - new Date(n.resolvedAt).getTime() < SHOW_RESOLVED_FOR_MS)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}
