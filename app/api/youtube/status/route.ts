import { isYouTubeQuotaExceeded } from "@/lib/youtube";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  const quotaExceeded = await isYouTubeQuotaExceeded();
  return NextResponse.json({ quotaExceeded });
}
