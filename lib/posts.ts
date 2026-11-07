// Shared types and helpers for the Posts module.
// Client-safe (no server-only imports) — used by the admin client pages.
// Server-side data fetchers live in `lib/posts.server.ts`.

export type HeroStyle = "plain" | "image" | "banner";

export const HERO_STYLES: { value: HeroStyle; label: string; help: string }[] = [
  { value: "plain", label: "Plain", help: "Title above the content" },
  { value: "image", label: "Image", help: "Full-width photo with the title over it" },
  { value: "banner", label: "Banner", help: "Coloured band with the title" },
];

export interface Post {
  id: string;
  title: string;
  slug: string;
  body: string | null;
  is_published: boolean;
  hero_style: HeroStyle;
  hero_image_url: string | null;
  subtitle: string | null;
  description: string | null;
  og_image_url: string | null;
  show_rails: boolean;
  /** Out of the sitemap and `noindex` — for QR-only or private pages. */
  hide_from_search: boolean;
  /** Admin-only labels for grouping the list. Never shown publicly. */
  tags: string[];
  /** Set while the post is in the Bin; purged 30 days later. */
  deleted_at: string | null;
  /** Name (or email) of whoever last saved it. */
  updated_by: string | null;
  /**
   * Unpublished edits to a live page's content (DRAFT_FIELDS only). The public
   * page serves the columns; previews and the editor show this.
   */
  draft: Partial<PostFields> | null;
  /** Served only from this moment, when set. */
  publish_from: string | null;
  /** Taken down at this moment, when set. */
  publish_until: string | null;
  /** Set by "Ask for review"; cleared by publishing or withdrawing. */
  review_requested_at?: string | null;
  review_requested_by?: string | null;
  created_at: string;
  updated_at: string;
  /** Admin list only: non-bot views in the last 30 days, when counted. */
  views_30d?: number;
}

/** The fields the editor edits — everything but ids and timestamps. */
export type PostFields = Pick<
  Post,
  | "title"
  | "slug"
  | "body"
  | "is_published"
  | "hero_style"
  | "hero_image_url"
  | "subtitle"
  | "description"
  | "og_image_url"
  | "show_rails"
  | "hide_from_search"
  | "tags"
  | "publish_from"
  | "publish_until"
>;

/**
 * The fields a draft of a live page holds: what the page shows. Everything
 * else (tags, search visibility, schedule) is a setting about the page and
 * applies as soon as it's saved.
 */
export const DRAFT_FIELDS = [
  "title",
  "slug",
  "body",
  "hero_style",
  "hero_image_url",
  "subtitle",
  "description",
  "og_image_url",
  "show_rails",
] as const satisfies readonly (keyof PostFields)[];

export type DraftField = (typeof DRAFT_FIELDS)[number];

/** The draft fields of a post or form, for a draft column or a revision. */
export function pickDraftFields(source: Partial<PostFields>): Partial<PostFields> {
  const out: Record<string, unknown> = {};
  for (const key of DRAFT_FIELDS) if (source[key] !== undefined) out[key] = source[key];
  return out as Partial<PostFields>;
}

export type PostState = "draft" | "scheduled" | "live" | "ended";

/**
 * Where a post stands with the public right now: never published or switched
 * off ("draft"), published but before its start ("scheduled"), served
 * ("live"), or past its end ("ended").
 */
export function postState(
  post: Pick<Post, "is_published" | "publish_from" | "publish_until">,
  now = Date.now(),
): PostState {
  if (!post.is_published) return "draft";
  if (post.publish_from && new Date(post.publish_from).getTime() > now) return "scheduled";
  if (post.publish_until && new Date(post.publish_until).getTime() <= now) return "ended";
  return "live";
}

/** Search engines truncate meta descriptions around here. */
export const DESCRIPTION_LIMIT = 160;

/** Tags: a handful of short labels, not a taxonomy. */
export const MAX_TAGS = 8;
export const MAX_TAG_LENGTH = 30;

/**
 * Trim, drop empties, cap length and de-duplicate case-insensitively (the
 * first spelling wins), so "Alpha" and "alpha " don't become two filters.
 */
export function normaliseTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = raw.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length === MAX_TAGS) break;
  }
  return out;
}

/** How long a deleted post stays in the Bin before it is purged. */
export const BIN_DAYS = 30;

/** The public site's origin, for share links and QR codes. */
export const SITE_ORIGIN = "https://destinytees.uk";

// Base path for the admin Posts API.
export const API = "/api/admin/posts";
