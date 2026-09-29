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
  created_at: string;
  updated_at: string;
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
>;

/** Search engines truncate meta descriptions around here. */
export const DESCRIPTION_LIMIT = 160;

// Base path for the admin Posts API.
export const API = "/api/admin/posts";
