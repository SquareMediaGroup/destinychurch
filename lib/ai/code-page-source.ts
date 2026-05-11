/**
 * Server-side helpers for reading AI-generated page source code off disk.
 *
 * Used by:
 *  - the backfill route that registers every existing app/<slug>/page.tsx
 *    in the builder_pages dashboard
 *  - the extract-texts route that asks the LLM to produce an editable
 *    text catalog for a page that was generated before the visual
 *    editor existed
 */
import { promises as fs } from "fs";
import path from "path";

const ROOT = process.cwd();
const APP_DIR = path.join(ROOT, "app");

// Top-level app/ entries that are NOT user-facing volunteer pages.
const APP_DIR_EXCLUDE = new Set([
  "admin",
  "api",
  "auth",
  "_next",
  "search",
  "[slug]",
]);

const APP_FILE_EXCLUDE = new Set([
  "favicon.ico",
  "robots.ts",
  "sitemap.ts",
  "layout.tsx",
  "page.tsx",
  "globals.css",
  "not-found.tsx",
]);

export interface CodePageRef {
  slug: string;
  sourcePath: string; // repo-relative
  title: string; // best-effort, falls back to slug-titled
}

function titleFromMetadata(source: string, fallback: string): string {
  // Match either: title: "..."  OR  title: '...'  on the metadata export
  const m =
    source.match(/title:\s*"([^"]+)"/) ||
    source.match(/title:\s*'([^']+)'/);
  return m ? m[1] : fallback;
}

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * List every app/<slug>/page.tsx route directory we consider a candidate
 * for the AI-generated dashboard. Excludes admin/api/auth and other system routes.
 */
export async function listCodePages(): Promise<CodePageRef[]> {
  const entries = await fs.readdir(APP_DIR, { withFileTypes: true });
  const refs: CodePageRef[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (APP_DIR_EXCLUDE.has(entry.name)) continue;
    if (APP_FILE_EXCLUDE.has(entry.name)) continue;
    if (entry.name.startsWith("_")) continue;

    const pagePath = path.join(APP_DIR, entry.name, "page.tsx");
    let source: string;
    try {
      source = await fs.readFile(pagePath, "utf-8");
    } catch {
      continue; // dir exists but no page.tsx (could be route group, layout-only, etc.)
    }

    const slug = entry.name;
    const title = titleFromMetadata(source, humanizeSlug(slug));
    refs.push({
      slug,
      sourcePath: path.relative(ROOT, pagePath),
      title,
    });
  }
  return refs;
}

/**
 * Extract local @/components/... imports from a source file. Used to feed
 * the LLM the bodies of any custom-cloned hero / section components that
 * a page composes — those are where most of the editable text lives.
 */
function extractComponentImports(source: string): string[] {
  const re = /from\s+["']@\/components\/([^"']+)["']/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    out.push(m[1]); // e.g. "alpha/AlphaLaunchHero"
  }
  return out;
}

export interface PageWithImports {
  slug: string;
  sourcePath: string;
  pageSource: string;
  components: Array<{ path: string; source: string }>;
}

/**
 * Read an app/<slug>/page.tsx plus the source of every component it imports
 * from @/components/... (best effort). Shared, top-level components are
 * intentionally included — the LLM filters out files that have no editable
 * text (e.g. hardcoded shared components).
 */
export async function readPageWithImports(slug: string): Promise<PageWithImports> {
  const sourcePath = path.join(APP_DIR, slug, "page.tsx");
  const pageSource = await fs.readFile(sourcePath, "utf-8");

  const importPaths = extractComponentImports(pageSource);
  const components: Array<{ path: string; source: string }> = [];

  for (const imp of importPaths) {
    const candidate = path.join(ROOT, "components", `${imp}.tsx`);
    try {
      const src = await fs.readFile(candidate, "utf-8");
      components.push({
        path: path.relative(ROOT, candidate),
        source: src,
      });
    } catch {
      // Component file missing — skip silently. Could be a folder index, etc.
    }
  }

  return {
    slug,
    sourcePath: path.relative(ROOT, sourcePath),
    pageSource,
    components,
  };
}
