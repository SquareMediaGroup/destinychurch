import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";
  const boardId = searchParams.get("board_id");

  const supabase = createServiceClient();
  // The FK relationship must be named explicitly: media_boards.cover_photo_id
  // also references media_photos, so an unqualified embed is ambiguous between
  // "the board this photo belongs to" and "the photo this board uses as a cover".
  let query = supabase
    .from("media_photos")
    .select("*, media_boards!media_photos_board_id_fkey(title, slug)")
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);
  if (boardId) query = query.eq("board_id", boardId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const photosWithUrls = (data ?? []).map((photo) => ({
    ...photo,
    url: supabase.storage.from("media-photos").getPublicUrl(photo.file_path).data.publicUrl,
  }));

  return NextResponse.json(photosWithUrls);
}
