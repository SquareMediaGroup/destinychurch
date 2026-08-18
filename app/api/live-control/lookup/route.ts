// "What is this link?" for the controls on /live.
//
// ⚠️ Self-authorising — see the note in ../route.ts. requireHost() comes first:
// this route spends YouTube API quota, so it must not be callable by anyone who
// happens to find the path.

import { NextResponse } from "next/server";
import { requireHost } from "@/lib/liveChatAuth";
import { lookupResponse } from "@/lib/simulatedLiveLookup";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireHost();
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.status === 401 ? "Sign in to run the broadcast." : "Hosts only." },
      { status: auth.status, headers: { "Cache-Control": "no-store" } }
    );
  }

  return lookupResponse(new URL(request.url).searchParams.get("url") ?? "");
}
