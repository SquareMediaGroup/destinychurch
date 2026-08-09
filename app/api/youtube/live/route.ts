import { getLiveStatus } from "@/lib/youtube";
import { NextResponse } from "next/server";

// Detection is memoised in-process by getLiveStatus() and the CDN holds the
// response for 30s, so this staying dynamic costs little and means the route
// can never serve a build-time answer to "are we live right now".
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = await getLiveStatus();
  const debug = new URL(request.url).searchParams.has("debug");

  // `source` names the detection layer that answered (channel-page,
  // videos.list, confirmed-offline, no-signal, …). Handy for working out why
  // the banner is or isn't showing without redeploying; omitted by default so
  // the polled payload stays small.
  const { source, ...publicStatus } = status;

  return NextResponse.json(debug ? { ...publicStatus, source } : publicStatus, {
    headers: {
      "Cache-Control": debug
        ? "no-store"
        : "public, s-maxage=30, stale-while-revalidate=30",
    },
  });
}
