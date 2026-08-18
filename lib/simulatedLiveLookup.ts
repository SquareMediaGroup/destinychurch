// The shared body of both "what is this link?" routes — /admin/live's and the
// one behind the controls on /live. Only the auth around them differs.

import "server-only";
import { NextResponse } from "next/server";
import { parseYouTubeId } from "@/lib/simulatedLive";
import { lookupVideo } from "@/lib/youtubeLookup.server";

export async function lookupResponse(input: string) {
  const videoId = parseYouTubeId(input);

  if (!videoId) {
    return NextResponse.json(
      { error: "That doesn't look like a YouTube link or video ID." },
      { status: 400 }
    );
  }

  const video = await lookupVideo(videoId);
  if (!video) {
    // The id is well-formed but unreadable. Still hand it back: an unlisted
    // video that the API declines to describe will usually still *play*, and
    // the runtime can be typed in by hand.
    return NextResponse.json(
      {
        videoId,
        title: null,
        durationSeconds: null,
        thumbnail: null,
        unreadable: true,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(video, { headers: { "Cache-Control": "no-store" } });
}
