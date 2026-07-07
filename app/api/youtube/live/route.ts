import { getLiveStatus } from "@/lib/youtube";
import { NextResponse } from "next/server";

export const revalidate = 60;

export async function GET() {
  const status = await getLiveStatus();
  return NextResponse.json(status, {
    headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=30" },
  });
}
