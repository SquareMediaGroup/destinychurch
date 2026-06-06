// Server-only data fetchers for the public /jobs pages.
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase";
import type { Job } from "@/lib/jobs";

/** All published roles, ordered for display. Used by the public /jobs page. */
export async function getPublishedJobs(): Promise<Job[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getPublishedJobs error:", error.message);
    return [];
  }
  return (data ?? []) as Job[];
}

/** A single published role by slug, or null. Used by /jobs/[slug]. */
export async function getJobBySlug(slug: string): Promise<Job | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("getJobBySlug error:", error.message);
    return null;
  }
  return (data as Job) ?? null;
}
