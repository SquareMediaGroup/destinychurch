// Shared slug validation for the Posts API (used by create, update and the
// live check-slug endpoint). Takes a service client so callers control auth.
import type { createServiceClient } from "@/utils/supabase/service";
import { isReservedSlug, normalizeSlug } from "@/lib/reserved-slugs";

type ServiceClient = ReturnType<typeof createServiceClient>;

export type SlugCheck =
  /**
   * `reclaimsRedirectId`: the slug is held by a redirect that points at this
   * very post (left behind when its URL changed). Taking the old URL back is
   * allowed; the caller deletes that redirect when it publishes.
   */
  | { ok: true; slug: string; reclaimsRedirectId?: string }
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
    .select("id, slug, target_url")
    .eq("slug", slug)
    .maybeSingle();
  if (existingRedirect && excludeId) {
    const { data: self } = await supabase.from("posts").select("slug").eq("id", excludeId).maybeSingle();
    if (self && existingRedirect.target_url === `/${self.slug}`) {
      return { ok: true, slug, reclaimsRedirectId: existingRedirect.id as string };
    }
  }
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
