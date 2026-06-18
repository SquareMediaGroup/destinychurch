// Server-only data fetchers for the public Posts pages (the /[slug] catch-all).
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Post } from "@/lib/posts";

/** A single published post by slug, or null. Used by the /[slug] catch-all. */
export async function getPublishedPostBySlug(slug: string): Promise<Post | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("getPublishedPostBySlug error:", error.message);
    return null;
  }
  return (data as Post) ?? null;
}
