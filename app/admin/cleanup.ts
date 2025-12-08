"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase";

const ADMIN_COOKIE = "destiny-admin";

export async function cleanDuplicates(): Promise<void> {
  const cookieStore = await cookies();
  const authed = cookieStore.get(ADMIN_COOKIE)?.value === "1";
  if (!authed) throw new Error("Unauthorized");

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("sermons")
    .select("id, youtube_video_id, podcast_guid, date");

  if (error) throw new Error(error.message);
  if (!data) return;

  const keepIds = new Set<string>();
  const deleteIds = new Set<string>();

  const seenYoutube = new Map<string, string>();
  const seenPodcast = new Map<string, string>();

  const rows = data as {
    id: string;
    youtube_video_id: string | null;
    podcast_guid: string | null;
    date: string | null;
  }[];

  for (const row of rows) {
    const by = (val: string | null | undefined, map: Map<string, string>) => {
      if (!val) return;
      if (map.has(val)) {
        deleteIds.add(row.id);
      } else {
        map.set(val, row.id);
      }
    };
    by(row.youtube_video_id, seenYoutube);
    by(row.podcast_guid, seenPodcast);
  }

  // Ensure we never delete the first encountered ID for each map
  seenYoutube.forEach((id) => keepIds.add(id));
  seenPodcast.forEach((id) => keepIds.add(id));

  const finalDeletes = [...deleteIds].filter((id) => !keepIds.has(id));

  if (finalDeletes.length) {
    const { error: delError } = await supabase
      .from("sermons")
      .delete()
      .in("id", finalDeletes);
    if (delError) throw new Error(delError.message);
  }

  revalidatePath("/sermons");
  revalidatePath("/admin");
}
