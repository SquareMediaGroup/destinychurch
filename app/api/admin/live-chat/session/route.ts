// Opening, pausing and closing the room.
//
// Auth comes free: middleware.ts matches /api/admin/:path*, and lib/adminRoles.ts
// maps /api/admin/live-chat to the `host` role — so an unauthenticated or
// non-Host caller never reaches this file.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import {
  getSessionById,
  getOrOpenCurrentSession,
  setSessionState,
  type ChatState,
} from "@/lib/liveChat.server";
import { recordAudit } from "@/lib/audit.server";

export const dynamic = "force-dynamic";

const STATES: ChatState[] = ["open", "paused", "closed"];

/** The current room, plus the recent ones so the console can show history. */
export async function GET() {
  const current = await getOrOpenCurrentSession();

  const supabase = createServiceClient();
  const { data: recent } = await supabase
    .from("live_chat_sessions")
    .select("id, video_id, title, state, opened_at, closed_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json(
    { current, recent: recent ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  let body: { session?: unknown; state?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const sessionId = typeof body.session === "string" ? body.session : "";
  const state = body.state;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session." }, { status: 400 });
  }
  if (typeof state !== "string" || !STATES.includes(state as ChatState)) {
    return NextResponse.json(
      { error: "State must be open, paused or closed." },
      { status: 400 },
    );
  }

  const existing = await getSessionById(sessionId);
  if (!existing) {
    return NextResponse.json({ error: "No such chat." }, { status: 404 });
  }

  const updated = await setSessionState(sessionId, state as ChatState);
  if (!updated) {
    return NextResponse.json({ error: "Couldn't update the chat." }, { status: 500 });
  }

  await recordAudit({
    action: "update",
    section: "live",
    entity: "live chat room",
    entityId: sessionId,
    entityLabel: updated.title ?? sessionId,
    summary: `${
      state === "open" ? "Opened" : state === "paused" ? "Paused" : "Closed"
    } the live chat for “${updated.title ?? sessionId}”`,
    changes: { state: { from: existing.state ?? null, to: state } },
  });

  return NextResponse.json({ session: updated });
}
