// Shared slug validation for the Posts API (used by create, update and the
// live check-slug endpoint). Takes a service client so callers control auth.
import type { createServiceClient } from "@/utils/supabase/service";
import { isReservedSlug, normalizeSlug } from "@/lib/reserved-slugs";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type SlugCheck =
  | { ok: true; slug: string }
  | { ok: false; slug: string; reason: string; status: number };

/**
 * Validate an admin-chosen slug: sensible shape, not reserved, and not already
 * taken by another post or an active redirect.
 */
export async function checkSlug(
  supabase: ServiceClient,
  raw: string,
  excludeId?: string,
): Promise<SlugCheck> {
  const slug = normalizeSlug(raw || "");
  if (!slug) {
    return { ok: false, slug, reason: "Please enter a URL slug.", status: 400 };
  }
  if (isReservedSlug(slug)) {
    return {
      ok: false,
      slug,
      reason: `"${slug}" is a reserved address and can't be used. Try a more specific slug.`,
      status: 400,
    };
  }

  let postQuery = supabase.from("posts").select("id").eq("slug", slug);
  if (excludeId) postQuery = postQuery.neq("id", excludeId);
  const { data: existingPost } = await postQuery.maybeSingle();
  if (existingPost) {
    return { ok: false, slug, reason: `The slug "${slug}" is already in use.`, status: 409 };
  }

  const { data: existingRedirect } = await supabase
    .from("redirects")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (existingRedirect) {
    return {
      ok: false,
      slug,
      reason: `The slug "${slug}" is already used by a redirect.`,
      status: 409,
    };
  }

  return { ok: true, slug };
}
