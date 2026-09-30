// Admin: Spotify sends the church account back here with a code.

import { NextResponse } from "next/server";
import { recordAudit } from "@/lib/audit.server";
import { connectAccount } from "@/lib/spotify.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const back = (result: string) => {
    const res = NextResponse.redirect(`${url.origin}/admin/song-requests?spotify=${result}`);
    res.cookies.delete({ name: "spotify_oauth_state", path: "/api/admin/song-requests/spotify" });
    return res;
  };

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith("spotify_oauth_state="))
    ?.split("=")[1];

  if (url.searchParams.get("error") || !code) return back("denied");
  if (!state || !cookieState || state !== cookieState) return back("state_mismatch");

  try {
    await connectAccount(code, url.origin);
    await recordAudit({
      action: "update",
      section: "announcements",
      entity: "song requests",
      entityLabel: "Spotify account",
      summary: "Connected the Spotify account for song requests",
    });
    return back("connected");
  } catch (e) {
    console.error("spotify connect failed:", e);
    return back("failed");
  }
}
