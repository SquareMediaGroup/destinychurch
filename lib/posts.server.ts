// Server-only data fetchers for the public Posts pages (the /[slug] catch-all).
import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import type { Post } from "@/lib/posts";
import { verifyPreviewToken } from "@/lib/postPreview.server";

/**
 * The post at this slug, or null. Published posts are returned to anyone; a
 * draft only when `previewToken` is a valid signed preview for that post.
 */
export async function getPostForView(
  slug: string,
  previewToken?: string,
): Promise<{ post: Post; preview: boolean } | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("getPostForView error:", error.message);
    return null;
  }
  const post = data as Post | null;
  if (!post) return null;
  if (post.is_published) return { post, preview: false };
  if (verifyPreviewToken(post.id, previewToken)) return { post, preview: true };
  return null;
}

