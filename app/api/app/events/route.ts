import { NextResponse } from "next/server";
import { fetchChurchSuiteEvents, deduplicateEvents } from "@destiny/shared";

// App BFF — normalized events feed for the mobile app.
// Proxies the ChurchSuite public calendar live (short-TTL edge cache only, no
// persisted shadow store) and returns the deduplicated shape the app renders.
export const revalidate = 300;

export async function GET() {
  const raw = await fetchChurchSuiteEvents({ next: { revalidate: 300 } });
  const events = deduplicateEvents(raw);

  return NextResponse.json(
    { events },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    },
  );
}
