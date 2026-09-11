import { NextResponse } from "next/server";
import { getUploadedVideos } from "@/lib/youtube";

export async function GET(req: Request) {
  const pageToken = new URL(req.url).searchParams.get("pageToken") ?? undefined;
  const page = await getUploadedVideos(pageToken);
  return NextResponse.json(page);
}
