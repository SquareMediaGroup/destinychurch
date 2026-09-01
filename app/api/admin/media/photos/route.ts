import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getTemporaryDisplayUrl } from "@/lib/playbook.server";

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

  // Approved photos already have a permanent permalink stored; anything else
  // (pending, rejected) gets a fresh ~24h signed URL fetched on demand — the
  // admin queue is reviewed within minutes, so a permalink (plan-capped, and
  // only meaningful once a photo is actually public) would be wasted here.
  const photosWithUrls = await Promise.all(
    (data ?? []).map(async (photo) => ({
      ...photo,
      url:
        photo.playbook_permalink_url ??
        (photo.playbook_asset_token
          ? await getTemporaryDisplayUrl(photo.playbook_asset_token).catch(() => null)
          : null),
    })),
  );

  return NextResponse.json(photosWithUrls);
}
