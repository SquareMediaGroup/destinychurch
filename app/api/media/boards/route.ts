import { NextResponse } from "next/server";
import { getPublicBoards } from "@/lib/media.server";

export async function GET() {
  const boards = await getPublicBoards();
  return NextResponse.json(boards);
}
