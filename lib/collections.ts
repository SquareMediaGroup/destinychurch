import { createServiceClient } from "@/utils/supabase/service";

export interface SermonCollection {
  id: string;
  type: "playlist" | "series";
  title: string;
  description: string | null;
  youtube_playlist_id: string;
  thumbnail_url: string | null;
  display_order: number;
}

export async function getCollections(type: SermonCollection["type"]): Promise<SermonCollection[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sermon_collections")
    .select("id, type, title, description, youtube_playlist_id, thumbnail_url, display_order")
    .eq("type", type)
    .eq("active", true)
    .order("display_order", { ascending: true });
  return (data ?? []) as SermonCollection[];
}

export async function getAllCollections(): Promise<SermonCollection[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("sermon_collections")
    .select("id, type, title, description, youtube_playlist_id, thumbnail_url, display_order")
    .eq("active", true)
    .order("display_order", { ascending: true });
  return (data ?? []) as SermonCollection[];
}