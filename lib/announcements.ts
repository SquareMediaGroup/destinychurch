import "server-only";

import { tryGetSupabaseAdmin } from "./supabase";

export type SiteAnnouncement = {
  id: string;
  message: string;
  description?: string;
};

export async function getActiveAnnouncement(): Promise<SiteAnnouncement | null> {
  const supabase = tryGetSupabaseAdmin();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from("site_banner")
      .select("id, message, description, updated_at")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data?.length) return null;
    const row = data[0] as { id: string; message: string | null; description: string | null };
    const message = String(row.message || "").trim();
    if (!message) return null;
    const description = String(row.description || "").trim();

    return {
      id: row.id,
      message,
      description: description || undefined,
    };
  } catch (error) {
    console.error("Failed to load announcement", error);
    return null;
  }
}
