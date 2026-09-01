// Server-only reads for /media — the public photo gallery.
//
// Mirrors lib/governance.server.ts's role: the one place pages and public API
// routes go for board/photo data, so the "only approved photos, only public
// boards" rules live in one spot rather than being re-implemented per caller.
import "server-only";
import { createServiceClient } from "@/utils/supabase/service";

// Approved photos are served from their stored Playbook permalink — a
// permanent, unsigned CDN URL created once at approval time (see
// app/api/admin/media/photos/[id]/approve/route.ts) — never re-fetched here.

export interface MediaBoardSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverPhotoUrl: string | null;
  coverIsVideo: boolean;
  photoCount: number;
}

export interface MediaBoard {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isPublic: boolean;
  allowUploads: boolean;
  shareToken: string;
  hasPassword: boolean;
}

export interface MediaPhoto {
  id: string;
  url: string;
  fileName: string;
  uploaderName: string;
  createdAt: string;
  isVideo: boolean;
}

/** Public boards, newest first, with their approved-photo count and cover. */
export async function getPublicBoards(): Promise<MediaBoardSummary[]> {
  const supabase = createServiceClient();
  const { data: boards } = await supabase
    .from("media_boards")
    .select("id, title, slug, description, cover_photo_id")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (!boards || boards.length === 0) return [];

  const boardIds = boards.map((b) => b.id);
  const { data: photos } = await supabase
    .from("media_photos")
    .select("id, board_id, playbook_permalink_url, mime_type")
    .in("board_id", boardIds)
    .eq("status", "approved");

  const countByBoard = new Map<string, number>();
  const urlById = new Map<string, string | null>();
  const mimeById = new Map<string, string | null>();
  for (const photo of photos ?? []) {
    countByBoard.set(photo.board_id, (countByBoard.get(photo.board_id) ?? 0) + 1);
    urlById.set(photo.id, photo.playbook_permalink_url);
    mimeById.set(photo.id, photo.mime_type);
  }

  return boards.map((board) => {
    const coverUrl = board.cover_photo_id ? urlById.get(board.cover_photo_id) : undefined;
    return {
      id: board.id,
      title: board.title,
      slug: board.slug,
      description: board.description,
      coverPhotoUrl: coverUrl ?? null,
      coverIsVideo: Boolean(
        board.cover_photo_id && mimeById.get(board.cover_photo_id)?.startsWith("video/"),
      ),
      photoCount: countByBoard.get(board.id) ?? 0,
    };
  });
}

/** A public board by slug. Never returns a private board — see /media/s/[token] for those. */
export async function getBoardBySlug(slug: string): Promise<MediaBoard | null> {
  const { data } = await createServiceClient()
    .from("media_boards")
    .select("id, title, slug, description, is_public, allow_uploads, share_token, password_hash")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  return data ? toBoard(data) : null;
}

/** A board (public or private) by its unguessable share token. */
export async function getBoardByToken(token: string): Promise<MediaBoard | null> {
  const { data } = await createServiceClient()
    .from("media_boards")
    .select("id, title, slug, description, is_public, allow_uploads, share_token, password_hash")
    .eq("share_token", token)
    .maybeSingle();

  return data ? toBoard(data) : null;
}

function toBoard(data: {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_public: boolean;
  allow_uploads: boolean;
  share_token: string;
  password_hash: string | null;
}): MediaBoard {
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    description: data.description,
    isPublic: data.is_public,
    allowUploads: data.allow_uploads,
    shareToken: data.share_token,
    // The hash itself never leaves this module — callers only ever need to
    // know whether one is set, not what it hashes to.
    hasPassword: Boolean(data.password_hash),
  };
}

/** Approved photos (and videos) for a board, newest first. */
export async function getApprovedPhotos(boardId: string): Promise<MediaPhoto[]> {
  const { data } = await createServiceClient()
    .from("media_photos")
    .select("id, playbook_permalink_url, file_name, uploader_name, created_at, mime_type")
    .eq("board_id", boardId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(500);

  return (data ?? [])
    .filter((photo) => photo.playbook_permalink_url)
    .map((photo) => ({
      id: photo.id,
      url: photo.playbook_permalink_url as string,
      fileName: photo.file_name,
      uploaderName: photo.uploader_name,
      createdAt: photo.created_at,
      isVideo: Boolean(photo.mime_type?.startsWith("video/")),
    }));
}

export interface PublicPhotoMatch {
  id: string;
  url: string;
  boardTitle: string;
  boardSlug: string;
}

/**
 * Given a set of Playbook asset tokens (e.g. from an AI search across the
 * whole Playbook org — see lib/smartSearch/tools.ts's find_photos), returns
 * only the ones that are ALSO an approved photo on a public /media board.
 *
 * This is the safety boundary for surfacing Playbook search results to public
 * visitors: Playbook's AI search has no concept of our moderation queue or
 * private boards, so a naive pass-through would leak pending uploads, private
 * (unlisted) board photos, or entirely unrelated organisation assets (e.g. the
 * church's other, non-/media Playbook boards) to anyone who asks the right
 * question. Cross-checking every token against this table before returning
 * anything means a photo can only ever surface here if it already passed
 * moderation and its board is already public — the exact same rule
 * getApprovedPhotos()/getPublicBoards() enforce for the page itself.
 */
export async function findPublicPhotosByPlaybookTokens(
  tokens: string[],
): Promise<PublicPhotoMatch[]> {
  if (tokens.length === 0) return [];

  const { data } = await createServiceClient()
    .from("media_photos")
    .select("id, playbook_asset_token, playbook_permalink_url, mime_type, media_boards!media_photos_board_id_fkey(title, slug, is_public)")
    .in("playbook_asset_token", tokens)
    .eq("status", "approved");

  return (data ?? [])
    .map((row) => ({
      row,
      // Supabase's JS client types a to-one embed as an array; it's always
      // exactly one row here since board_id is a not-null FK.
      board: Array.isArray(row.media_boards) ? row.media_boards[0] : row.media_boards,
    }))
    // Photos only — the chat card that consumes this (find_photos) renders a
    // plain <img> grid, not a video player, so a matching video is left out
    // rather than shown as a broken thumbnail.
    .filter(
      ({ row, board }) =>
        row.playbook_permalink_url && board?.is_public && !row.mime_type?.startsWith("video/"),
    )
    .map(({ row, board }) => ({
      id: row.id,
      url: row.playbook_permalink_url as string,
      boardTitle: board!.title,
      boardSlug: board!.slug,
    }));
}
