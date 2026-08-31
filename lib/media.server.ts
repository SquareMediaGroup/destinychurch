// Server-only reads for /media — the public photo gallery.
//
// Mirrors lib/governance.server.ts's role: the one place pages and public API
// routes go for board/photo data, so the "only approved photos, only public
// boards" rules live in one spot rather than being re-implemented per caller.
import "server-only";
import { createServiceClient } from "@/utils/supabase/service";

export interface MediaBoardSummary {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverPhotoUrl: string | null;
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
}

export interface MediaPhoto {
  id: string;
  url: string;
  fileName: string;
  uploaderName: string;
  createdAt: string;
}

function photoUrl(filePath: string): string {
  return createServiceClient().storage.from("media-photos").getPublicUrl(filePath).data
    .publicUrl;
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
    .select("id, board_id, file_path")
    .in("board_id", boardIds)
    .eq("status", "approved");

  const countByBoard = new Map<string, number>();
  const pathById = new Map<string, string>();
  for (const photo of photos ?? []) {
    countByBoard.set(photo.board_id, (countByBoard.get(photo.board_id) ?? 0) + 1);
    pathById.set(photo.id, photo.file_path);
  }

  return boards.map((board) => {
    const coverPath = board.cover_photo_id ? pathById.get(board.cover_photo_id) : undefined;
    return {
      id: board.id,
      title: board.title,
      slug: board.slug,
      description: board.description,
      coverPhotoUrl: coverPath ? photoUrl(coverPath) : null,
      photoCount: countByBoard.get(board.id) ?? 0,
    };
  });
}

/** A public board by slug. Never returns a private board — see /media/s/[token] for those. */
export async function getBoardBySlug(slug: string): Promise<MediaBoard | null> {
  const { data } = await createServiceClient()
    .from("media_boards")
    .select("id, title, slug, description, is_public, allow_uploads, share_token")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  return data ? toBoard(data) : null;
}

/** A board (public or private) by its unguessable share token. */
export async function getBoardByToken(token: string): Promise<MediaBoard | null> {
  const { data } = await createServiceClient()
    .from("media_boards")
    .select("id, title, slug, description, is_public, allow_uploads, share_token")
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
}): MediaBoard {
  return {
    id: data.id,
    title: data.title,
    slug: data.slug,
    description: data.description,
    isPublic: data.is_public,
    allowUploads: data.allow_uploads,
    shareToken: data.share_token,
  };
}

/** Approved photos for a board, newest first. */
export async function getApprovedPhotos(boardId: string): Promise<MediaPhoto[]> {
  const { data } = await createServiceClient()
    .from("media_photos")
    .select("id, file_path, file_name, uploader_name, created_at")
    .eq("board_id", boardId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(500);

  return (data ?? []).map((photo) => ({
    id: photo.id,
    url: photoUrl(photo.file_path),
    fileName: photo.file_name,
    uploaderName: photo.uploader_name,
    createdAt: photo.created_at,
  }));
}
