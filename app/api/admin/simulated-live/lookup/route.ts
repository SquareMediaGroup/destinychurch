// "What is this link?" — the preview behind the admin URL field, so a mistyped
// video is caught while pasting rather than at 11am on Sunday.

import { NextResponse } from "next/server";
import { parseYouTubeId } from "@/lib/simulatedLive";
import { lookupVideo } from "./lookupVideo";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("url") ?? "";
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
      { status: 200 }
    );
  }

  return NextResponse.json(video);
}
