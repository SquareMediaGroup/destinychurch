// Server-only data fetchers for the public Posts pages (the /[slug] catch-all).
import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/utils/supabase/service";
import type { Post } from "@/lib/posts";
import { verifyPreviewToken } from "@/lib/postPreview.server";

/**
 * The post at this slug, or null. Published posts are returned to anyone; a
 * draft only when `previewToken` is a valid signed preview for that post. A
 * post in the Bin is gone as far as the public site is concerned.
 */
async function loadPostForView(
  slug: string,
  previewToken?: string,
): Promise<{ post: Post; preview: boolean } | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("getPostForView error:", error.message);
    return null;
  }
  const post = data as (Post & { review_link_version?: number }) | null;
  if (!post) return null;
  if (post.is_published) return { post, preview: false };
  if (verifyPreviewToken(post.id, previewToken, { version: post.review_link_version ?? 0 })) {
    return { post, preview: true };
  }
  return null;
}
// cache(): generateMetadata and the page both ask, but it's one query per request.
export const getPostForView = cache(loadPostForView);

/** Published, indexable posts for app/sitemap.ts. */
export async function listIndexablePosts(): Promise<{ slug: string; updated_at: string }[]> {
  const { data } = await createServiceClient()
    .from("posts")
    .select("slug, updated_at")
    .eq("is_published", true)
    .eq("hide_from_search", false)
    .is("deleted_at", null);
  return (data ?? []) as { slug: string; updated_at: string }[];
}
