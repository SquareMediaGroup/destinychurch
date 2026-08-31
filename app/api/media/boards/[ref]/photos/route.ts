import { NextResponse } from "next/server";
import { getApprovedPhotos, getBoardBySlug } from "@/lib/media.server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `ref` is a board id (uuid — from a board already resolved via slug or share
 * token) or a public board's slug directly. Either way only approved photos
 * ever come back; a private board's photos are reachable the same way its
 * page is — you need to have already resolved the board via its token first.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;

  const boardId = UUID_RE.test(ref) ? ref : ((await getBoardBySlug(ref))?.id ?? null);
  if (!boardId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const photos = await getApprovedPhotos(boardId);
  return NextResponse.json(photos);
}
