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
      summary,
      transcript
    )
  )
`;

export async function listPublicPlaylists(limit = 20): Promise<Playlist[]> {
  const supabase = tryGetSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("playlists")
    .select(baseSelect)
    .filter("is_public", "in", "(true,null)")
    .order("created_at", { ascending: false })
    .order("position", { foreignTable: "playlist_items", ascending: true })
    .limit(limit);

  if (error) {
    if ((error as any).code === "42P01") return [];
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
  const orFilters = [
    `slug.eq.${trimmed}`,
    `slug.eq.${lowered}`,
    `id.eq.${trimmed}`,
  ];
  if (altSlug && altSlug !== trimmed) {
    orFilters.push(`slug.eq.${altSlug}`);
  }
  if (altSlug && altSlug !== lowered) {
    orFilters.push(`slug.eq.${altSlug.toLowerCase()}`);
  }

  let query = supabase
    .from("playlists")
    .select(baseSelect)
    .or(orFilters.join(","))
    .order("position", { foreignTable: "playlist_items", ascending: true });

  if (!includePrivate) {
    query = query.filter("is_public", "in", "(true,null)");
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    if ((error as any).code === "42P01") return null;
    throw error;
  }
  if (!data) return null;
  return mapPlaylist(data as PlaylistRow);
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
