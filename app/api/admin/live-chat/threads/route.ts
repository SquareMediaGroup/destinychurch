// The Host side of direct messages: which threads are open.
//
// Reading and writing the messages themselves goes through
// /api/live-chat/messages with `channel=direct` and a `thread` — the same route
// the guest uses, because the only difference between the two sides is which
// thread key they're allowed to name, and that check already lives there.
//
// Auth comes free: middleware.ts + the `host` ROUTE_RULES entry.

import { NextResponse } from "next/server";
import { listThreads } from "@/lib/liveChat.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session." }, { status: 400 });
  }

  return NextResponse.json(
    { threads: await listThreads(sessionId) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
