import Fuse from "fuse.js";
import type { YTVideo } from "@/lib/youtube";
import { normalizeSpeakerName } from "@/lib/sermonTitle";

// Shared ranking used both by the sitewide Smart Search chat's find_sermons
// tool (lib/smartSearch/tools.ts) and the on-page search box
// (components/sermons/SermonGrid.tsx) — one config, no duplicated Fuse setup.
// Client-safe: no server-only imports.

export interface SearchSermonsOptions {
  speaker?: string;
  /** ISO date (YYYY-MM-DD) — only sermons published on or after this date. */
  afterDate?: string;
}

export function searchSermons(
  archive: YTVideo[],
  query: string,
  opts?: SearchSermonsOptions,
  limit = 12
): YTVideo[] {
  let pool = archive;

  if (opts?.speaker) {
    const norm = normalizeSpeakerName(opts.speaker);
    pool = pool.filter((v) => norm !== null && normalizeSpeakerName(v.speaker) === norm);
  }
  if (opts?.afterDate) {
    pool = pool.filter((v) => v.publishedAt >= opts.afterDate!);
  }

  const trimmed = query.trim();
  if (!trimmed) return pool.slice(0, limit);

  const fuse = new Fuse(pool, {
    keys: [
      { name: "title", weight: 0.6 },
      { name: "speaker", weight: 0.25 },
      { name: "description", weight: 0.15 },
    ],
    threshold: 0.5,
    ignoreLocation: true,
  });

  return fuse.search(trimmed).map((r) => r.item).slice(0, limit);
}
