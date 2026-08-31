import { NextResponse } from "next/server";
import { getBoardByToken } from "@/lib/media.server";

// Works for both public and private boards — this is the only way to reach a
// private one. A wrong token and a deleted board return the same 404 so a
// guess can't distinguish "close" from "doesn't exist".
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const board = await getBoardByToken(token);
  if (!board) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(board);
}
