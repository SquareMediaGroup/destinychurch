import type { PostgrestError } from "@supabase/supabase-js";
import { getSupabaseAdmin, tryGetSupabaseAdmin } from "./supabase";
import { mapRowToSermon, SermonRow } from "./db";
import { Playlist, PlaylistItem } from "./types";

type PlaylistItemRow = {
  id: string;
  position: number;
  sermons?: SermonRow | SermonRow[] | null;
};

type PlaylistRow = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
  playlist_items?: PlaylistItemRow[] | null;
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );

const mapPlaylistItem = (row: PlaylistItemRow): PlaylistItem | null => {
  const sermonRow = Array.isArray(row.sermons) ? row.sermons[0] : row.sermons;
  if (!sermonRow) return null;
  return {
    id: row.id,
    position: Number(row.position ?? 0),
    sermon: mapRowToSermon(sermonRow as SermonRow),
  };
};

const mapPlaylist = (row: PlaylistRow): Playlist => {
  const items =
    row.playlist_items
      ?.map(mapPlaylistItem)
      .filter(Boolean)
      .sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0)) as
      | PlaylistItem[]
      | undefined;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? undefined,
    isPublic: row.is_public ?? true,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    items: items ?? [],
  };
};

const baseSelect = `
  id,
  slug,
  title,
  description,
  is_public,
  created_at,
  updated_at,
  playlist_items (
    id,
    position,
    sermons:sermons (
      id,
      title,
      date,
      youtube_video_id,
      youtube_pub_date,
      podcast_guid,
      podcast_pub_date,
      podcast_audio_url,
      thumbnail_url,
      summary
    )
  )
`;

export async function listPublicPlaylists(limit = 20): Promise<Playlist[]> {
  const supabase = tryGetSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("playlists")
    .select(baseSelect)
    .or("is_public.eq.true,is_public.is.null")
    .order("created_at", { ascending: false })
    .order("position", { foreignTable: "playlist_items", ascending: true })
    .limit(limit);

  if (error) {
    if ((error as PostgrestError).code === "42P01") return [];
    throw error;
  }

  return (data as PlaylistRow[]).map(mapPlaylist);
}

export async function getPlaylistBySlugOrId(
  identifier: string,
  includePrivate = false,
): Promise<Playlist | null> {
  const supabase = tryGetSupabaseAdmin();
  if (!supabase) return null;
  const trimmed = identifier.trim();
  if (!trimmed) return null;
  const altSlug = slugify(trimmed);
  const lowered = trimmed.toLowerCase();
  const altLower = altSlug.toLowerCase();

  const buildQuery = () => {
    let query = supabase
      .from("playlists")
      .select(baseSelect)
      .order("position", { foreignTable: "playlist_items", ascending: true });
    if (!includePrivate) {
      query = query.or("is_public.eq.true,is_public.is.null");
    }
    return query;
  };

  const slugCandidates = [trimmed, lowered];
  if (altSlug && !slugCandidates.includes(altSlug)) slugCandidates.push(altSlug);
  if (altLower && !slugCandidates.includes(altLower)) slugCandidates.push(altLower);

  const tryFetch = async (candidate: string, useIlike = false) => {
    const column = "slug";
    let query = buildQuery();
    query = useIlike ? query.ilike(column, candidate) : query.eq(column, candidate);

    const { data, error } = await query.maybeSingle();
    if (error && error.code !== "PGRST116") {
      if (error.code === "42P01") return null;
      throw error;
    }
    return data ? mapPlaylist(data as PlaylistRow) : null;
  };

  for (const candidate of slugCandidates) {
    const exact = await tryFetch(candidate, false);
    if (exact) return exact;
    const loose = await tryFetch(candidate, true);
    if (loose) return loose;
  }

  if (isUuid(trimmed)) {
    const { data, error } = await buildQuery().eq("id", trimmed).maybeSingle();
    if (error && error.code !== "PGRST116") {
      if (error.code === "42P01") return null;
      throw error;
    }
    if (data) return mapPlaylist(data as PlaylistRow);
  }

  // Last resort: scan public playlists and match on slugified title.
  const all = await listPublicPlaylists(500);
  const matchFromList = all.find((p) => {
    const variants = [p.slug, slugify(p.slug || ""), slugify(p.title || "")]
      .filter(Boolean)
      .map((v) => v.toLowerCase());
    return variants.includes(trimmed.toLowerCase());
  });
  if (matchFromList) return matchFromList;

  return null;
}

export async function createPlaylistRecord(input: {
  title: string;
  description?: string;
  slug?: string;
  sermonIds: string[];
  isPublic?: boolean;
}): Promise<{ id: string; slug: string }> {
  const supabase = getSupabaseAdmin();
  const title = input.title.trim();
  if (!title) throw new Error("Title is required");
  const slug = slugify(input.slug || title);
  if (!slug) throw new Error("Slug could not be generated");

  const uniqueIds = Array.from(new Set(input.sermonIds)).filter(Boolean);
  if (uniqueIds.length === 0) throw new Error("At least one sermon is required");

  const { data: existing } = await supabase
    .from("playlists")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing?.id) {
    throw new Error("A playlist with that slug already exists");
  }

  const { data: playlist, error: playlistError } = await supabase
    .from("playlists")
    .insert({
      title,
      description: input.description || null,
      slug,
      is_public: input.isPublic ?? true,
      updated_at: new Date().toISOString(),
    })
    .select("id, slug")
    .single();

  if (playlistError) throw playlistError;
  const playlistId = playlist?.id as string;

  const items = uniqueIds.map((sermonId, index) => ({
    playlist_id: playlistId,
    sermon_id: sermonId,
    position: index + 1,
  }));

  const { error: itemError } = await supabase
    .from("playlist_items")
    .insert(items);

  if (itemError) throw itemError;

  return { id: playlistId, slug };
}

export { slugify };
