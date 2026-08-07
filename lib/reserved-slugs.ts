// Reserved / forbidden slugs for admin-authored Posts.
//
// A Post is served from the catch-all `/[slug]` route, but a *static* route
// (a real folder in /app) always wins over the catch-all. So a Post created
// on one of those slugs would be silently unreachable. We therefore forbid:
//   1. Next.js / framework reserved names, and
//   2. every existing top-level route folder in /app.
//
// Keep this list in sync when new top-level routes are added to /app.
// Client-safe: imported by both the editor (live feedback) and the API.

import { slugify } from "@/lib/jobs";

// Framework / system names that must never be used as a content slug.
const SYSTEM_SLUGS = [
  "api",
  "admin",
  "auth",
  "_next",
  "favicon.ico",
  "robots",
  "sitemap",
  "not-found",
  "page",
  "layout",
  "globals",
];

// Existing top-level routes (folders in /app). A Post on any of these would be
// shadowed by the real page, so they are reserved.
const ROUTE_SLUGS = [
  "about",
  "administration",
  "admin-login",
  "alpha",
  "annual-report-2025",
  "baptism",
  "beliefs",
  "cap-money",
  "child-dedication",
  "connect",
  "connect-card",
  "contact",
  "data-gdpr",
  "dckids",
  "destiny-recovery",
  "give",
  "governance",
  "help",
  "hire",
  // Temporary: app/home/ is the event-card variant preview. Remove this entry
  // when that route is deleted.
  "home",
  "jobs",
  "kids",
  "links",
  "login",
  "missions",
  "new-here",
  "nfc",
  "privacy",
  "safeguarding",
  "sermons",
  "serve",
  "shop",
  "terms",
  "training",
  "visit",
  "volunteer",
  "whats-on",
  "young-adults",
  "youth",
  // Defensive extras that aren't folders today but are likely future routes.
  "posts",
  "search",
];

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  ...SYSTEM_SLUGS,
  ...ROUTE_SLUGS,
]);

/** Normalise a free-text slug the same way the API stores it. */
export function normalizeSlug(input: string): string {
  return slugify(input);
}

/** Is this slug reserved by the framework or an existing route? */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(normalizeSlug(slug));
}
