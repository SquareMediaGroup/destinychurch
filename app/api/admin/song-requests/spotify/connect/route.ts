// Admin: start the one-time Spotify authorisation for the church account.

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { redirectUri, SPOTIFY_SCOPES, spotifyConfigured } from "@/lib/spotify.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  if (!spotifyConfigured())
    return NextResponse.redirect(`${origin}/admin/song-requests?spotify=not_configured`);

  const state = randomBytes(16).toString("hex");
  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri(origin),
    scope: SPOTIFY_SCOPES,
    state,
    show_dialog: "true",
  }).toString();

  const res = NextResponse.redirect(url);
  res.cookies.set("spotify_oauth_state", state, {
    httpOnly: true,
    secure: origin.startsWith("https"),
    sameSite: "lax",
    path: "/api/admin/song-requests/spotify",
    maxAge: 600,
  });
  return res;
}
