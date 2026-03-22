import { NextResponse } from "next/server";
import { getAllVideos } from "@/lib/youtube";

export async function GET() {
  const videos = await getAllVideos(50);
  return NextResponse.json(videos);
}
