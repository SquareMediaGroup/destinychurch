import { getLiveStatus } from "@/lib/liveStatus.server";
import { NextResponse } from "next/server";

// Detection is memoised in-process by getLiveStatus() and the CDN holds the
// response for 30s, so this staying dynamic costs little and means the route
// can never serve a build-time answer to "are we live right now".
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = await getLiveStatus();
  const debug = new URL(request.url).searchParams.has("debug");

  // `source` names the detection layer that answered (channel-page,
  // videos.list, simulated, confirmed-offline, no-signal, …). Handy for working
  // out why the banner is or isn't showing without redeploying; omitted by
  // default so the polled payload stays small.
  const { source, ...publicStatus } = status;

  // A simulated broadcast must not be served from the edge cache. The payload
  // carries `serverTime`, which the browser subtracts from its own clock to
  // work out how far into the video to be; a response held for 30 seconds
  // would hand every viewer a 30-second-old clock and put them 30 seconds
  // behind the rest of the room. Real broadcasts are unaffected — nothing in
  // that payload is time-sensitive to the second. `simulated` is set for both
  // an airing and a scheduled broadcast, which are exactly the two states where
  // a stale answer costs something.
  return NextResponse.json(debug ? { ...publicStatus, source } : publicStatus, {
    headers: {
      "Cache-Control":
        debug || status.simulated
          ? "no-store"
          : "public, s-maxage=30, stale-while-revalidate=30",
    },
  });
}
