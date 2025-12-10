import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";
import { createPlaylistRecord, slugify } from "@/lib/playlists";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const authed = cookieStore.get("destiny-admin")?.value === "1";
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const title = String(formData.get("title") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const sermonOrderRaw = String(formData.get("sermonOrder") || "");

  const sermonTokens = sermonOrderRaw
    .split(/\r?\n/)
    .flatMap((line) => line.split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  if (!title || sermonTokens.length === 0) {
    return NextResponse.redirect(new URL("/admin?playlistError=missing", request.url));
  }

  const supabase = getSupabaseAdmin();
  const { data: sermons, error } = await supabase
    .from("sermons")
    .select("id, youtube_video_id, podcast_guid");

  if (error) {
    return NextResponse.redirect(
      new URL(`/admin?playlistError=${encodeURIComponent(error.message)}`, request.url),
    );
  }

  const byId = new Map<string, string>();
  const byYoutube = new Map<string, string>();
  const byPodcast = new Map<string, string>();
  (sermons || []).forEach((row: any) => {
    if (row.id) byId.set(row.id, row.id);
    if (row.youtube_video_id) byYoutube.set(row.youtube_video_id, row.id);
    if (row.podcast_guid) byPodcast.set(row.podcast_guid, row.id);
  });

  const resolved: string[] = [];
  const missing: string[] = [];
  sermonTokens.forEach((token) => {
    const match = byId.get(token) || byYoutube.get(token) || byPodcast.get(token);
    if (match && !resolved.includes(match)) {
      resolved.push(match);
    } else if (!match) {
      missing.push(token);
    }
  });

  if (resolved.length === 0) {
    return NextResponse.redirect(new URL("/admin?playlistError=nomatch", request.url));
  }
  if (missing.length) {
    return NextResponse.redirect(
      new URL(
        `/admin?playlistError=missing-${encodeURIComponent(missing.slice(0, 3).join(","))}`,
        request.url,
      ),
    );
  }

  try {
    const { slug } = await createPlaylistRecord({
      title,
      description,
      slug: slugInput || slugify(title),
      sermonIds: resolved,
      isPublic: true,
    });

    revalidatePath("/playlists");
    revalidatePath(`/playlists/${slug}`);
    revalidatePath("/admin");

    return NextResponse.redirect(
      new URL(`/admin?playlist=ok&slug=${encodeURIComponent(slug)}`, request.url),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unable to create playlist";
    return NextResponse.redirect(
      new URL(`/admin?playlistError=${encodeURIComponent(message)}`, request.url),
    );
  }
}
