import { NextResponse } from "next/server";
import { getAllVideos } from "@/lib/youtube";

// The sermon library, as consumed by the website's client-side filtering.
//
// `getAllVideos` paginates search.list + videos.list, which is the most
// quota-expensive call we make against the YouTube API. This route had no
// cache headers at all, so every visitor who reached it went straight through
// to Google. The 15-minute edge cache matches the sermon BFF route.

export const revalidate = 900;

export async function GET() {
  const videos = await getAllVideos(50);
  return NextResponse.json(videos, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
    },
  });
}
