import { NextResponse } from "next/server";
import { getStatus } from "@/lib/status";
import { activeNotices } from "@/lib/notices";

// GET /api/status: the same report as the page, as JSON, for the apps (for
// example Destiny One's outage message) and for anyone else who wants it.
export const revalidate = 60;

export async function GET() {
  const report = await getStatus();
  return NextResponse.json(
    { ...report, notices: activeNotices() },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
