// Shared types and helpers for the Posts module.
// Client-safe (no server-only imports) — used by the admin client pages.
// Server-side data fetchers live in `lib/posts.server.ts`.

export interface Post {
  id: string;
  title: string;
  slug: string;
  body: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

// Base path for the admin Posts API.
export const API = "/api/admin/posts";
