import { NextResponse } from "next/server";
import { getBoardBySlug } from "@/lib/media.server";

// Slug lookup only, and only for public boards — a private board's slug
// never resolves here, so guessing one gets the same 404 as a typo. Private
// boards are only reachable via their share token (see boards/by-token).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const board = await getBoardBySlug(ref);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(board);
}
