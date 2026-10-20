// Server helpers for the admin Posts API (app/api/admin/posts).
import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/utils/supabase/service";
import { AUDIT_ACTOR_HEADERS } from "@/lib/audit";
import { recordAudit } from "@/lib/audit.server";
import { BIN_DAYS } from "@/lib/posts";

type ServiceClient = ReturnType<typeof createServiceClient>;

/**
 * Who is saving, for the list's "edited by": their admin profile name, else
 * their email (this is admin-only, never shown publicly), else null.
 */
export async function currentEditorName(supabase: ServiceClient): Promise<string | null> {
  try {
    const h = await headers();
    const id = h.get(AUDIT_ACTOR_HEADERS.id);
    const email = h.get(AUDIT_ACTOR_HEADERS.email) || null;
    if (!id) return email;
    const { data } = await supabase.from("admin_roles").select("name").eq("auth_user_id", id).maybeSingle();
    const name = (data?.name as string | null)?.trim();
    return name || email;
  } catch {
    return null;
  }
}

/**
 * Permanently delete posts that have sat in the Bin longer than BIN_DAYS.
 *
 * Run from the list endpoint rather than a cron: Vercel Hobby only allows daily
 * crons, the Bin only matters to someone looking at the list, and the purge is
 * one indexed query that usually matches nothing.
 */
export async function purgeExpiredBin(supabase: ServiceClient): Promise<void> {
  const cutoff = new Date(Date.now() - BIN_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("posts")
    .delete()
    .lt("deleted_at", cutoff)
    .select("id, title, slug");
  if (error) {
    console.error("⚠️ Posts bin purge failed:", error.message);
    return;
  }
  for (const post of data ?? []) {
    await recordAudit({
      action: "delete",
      section: "posts",
      entity: "post",
      entityId: post.id,
      entityLabel: post.title,
      summary: `Emptied the post “${post.title}” from the Bin after ${BIN_DAYS} days`,
      before: post,
    });
  }
}

/** Non-bot views per post id over the last 30 days. Empty if not countable. */
export async function postViewCounts(supabase: ServiceClient): Promise<Map<string, number>> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.rpc("post_view_counts", { p_since: since });
  if (error) {
    // Most likely the migration hasn't been applied yet; the list still works.
    console.error("⚠️ post_view_counts failed:", error.message);
    return new Map();
  }
  return new Map(
    ((data ?? []) as { post_id: string; views: number | string }[]).map((r) => [r.post_id, Number(r.views)]),
  );
}
