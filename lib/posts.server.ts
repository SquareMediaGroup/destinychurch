// Server-only data fetchers for the public Posts pages (the /[slug] catch-all).
import "server-only";
import { cache } from "react";
import { createServiceClient } from "@/utils/supabase/service";
import { pickDraftFields, postState, type Post } from "@/lib/posts";
import { verifyPreviewToken } from "@/lib/postPreview.server";

/**
 * The post at this slug, or null. A live post (published, inside its schedule)
 * is returned to anyone. With a valid signed preview token, the post is
 * returned whatever its state, with any unpublished draft laid over it, so a
 * review link shows the changes waiting to go live. A post in the Bin is gone
 * as far as the public site is concerned.
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
  if (previewToken && verifyPreviewToken(post.id, previewToken, { version: post.review_link_version ?? 0 })) {
    return { post: { ...post, ...pickDraftFields(post.draft ?? {}) }, preview: true };
  }
  if (postState(post) === "live") return { post, preview: false };
  return null;
}
// cache(): generateMetadata and the page both ask, but it's one query per request.
export const getPostForView = cache(loadPostForView);

/** Live, indexable posts for app/sitemap.ts. */
export async function listIndexablePosts(): Promise<{ slug: string; updated_at: string }[]> {
  const { data } = await createServiceClient()
    .from("posts")
    .select("slug, updated_at, is_published, publish_from, publish_until")
    .eq("is_published", true)
    .eq("hide_from_search", false)
    .is("deleted_at", null);
  return ((data ?? []) as Pick<Post, "slug" | "updated_at" | "is_published" | "publish_from" | "publish_until">[])
    .filter((p) => postState(p) === "live")
    .map(({ slug, updated_at }) => ({ slug, updated_at }));
}
