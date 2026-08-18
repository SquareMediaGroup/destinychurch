// Host moderation actions: approve, hide, mute, unmute.
//
// Auth comes free (middleware.ts + the `host` ROUTE_RULES entry), but the acting
// user's id does not — it's needed for the audit columns, so this route reads
// the session itself via readHost().
//
// Every action names a *message*, never a guest. The server resolves the author
// from the row, which is why no guest id is ever broadcast to the room: a Host
// can mute someone from a message they can see without the page ever having been
// told who that person is.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { readHost } from "@/lib/liveChatAuth";
import {
  getSessionById,
  setMessageStatus,
  emitMessage,
  emitHidden,
  listHeld,
  toHostMessage,
} from "@/lib/liveChat.server";

export const dynamic = "force-dynamic";

type Action = "approve" | "hide" | "mute" | "unmute";
const ACTIONS: Action[] = ["approve", "hide", "mute", "unmute"];

/** The held queue for a session. */
export async function GET(request: Request) {
  const sessionId = new URL(request.url).searchParams.get("session");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session." }, { status: 400 });
  }

  const supabase = createServiceClient();
  const [held, blocks] = await Promise.all([
    listHeld(sessionId),
    supabase
      .from("live_chat_blocks")
      .select("id, guest_id, scope, reason, created_at, expires_at")
      .or(`session_id.eq.${sessionId},scope.eq.global`),
  ]);

  return NextResponse.json(
    { held: held.map(toHostMessage), blocks: blocks.data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const host = await readHost();
  // middleware has already established this, but the id is needed below and a
  // null here would silently write a null moderator.
  if (!host) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  let body: {
    action?: unknown;
    message?: unknown;
    blockId?: unknown;
    scope?: unknown;
    reason?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const action = body.action;
  if (typeof action !== "string" || !ACTIONS.includes(action as Action)) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── unmute ────────────────────────────────────────────────────────────────
  if (action === "unmute") {
    const blockId = typeof body.blockId === "string" ? body.blockId : "";
    if (!blockId) {
      return NextResponse.json({ error: "Missing blockId." }, { status: 400 });
    }
    const { error } = await supabase.from("live_chat_blocks").delete().eq("id", blockId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Everything else acts on a message.
  const messageId = typeof body.message === "string" ? body.message : "";
  if (!messageId) {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }

  // ── approve / hide ────────────────────────────────────────────────────────
  if (action === "approve" || action === "hide") {
    const row = await setMessageStatus(
      messageId,
      action === "approve" ? "visible" : "hidden",
      host.userId,
    );
    if (!row) {
      return NextResponse.json({ error: "No such message." }, { status: 404 });
    }

    // Approving publishes it to the room for the first time; hiding retracts it
    // from anyone who already has it on screen.
    if (action === "approve") await emitMessage(row);
    else await emitHidden(row);

    return NextResponse.json({ message: toHostMessage(row) });
  }

  // ── mute ──────────────────────────────────────────────────────────────────
  const { data: target } = await supabase
    .from("live_chat_messages")
    .select("id, session_id, author_guest_id, author_kind")
    .eq("id", messageId)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "No such message." }, { status: 404 });
  }
  if (target.author_kind !== "guest" || !target.author_guest_id) {
    return NextResponse.json(
      { error: "Only guests can be muted." },
      { status: 400 },
    );
  }

  const session = await getSessionById(target.session_id);
  if (!session) {
    return NextResponse.json({ error: "No such chat." }, { status: 404 });
  }

  const scope = body.scope === "global" ? "global" : "session";

  const { error: blockError } = await supabase.from("live_chat_blocks").insert({
    // A global mute carries across services and so belongs to no single one.
    session_id: scope === "global" ? null : session.id,
    guest_id: target.author_guest_id,
    scope,
    reason: typeof body.reason === "string" ? body.reason.slice(0, 200) : null,
    blocked_by: host.userId,
  });

  if (blockError) {
    return NextResponse.json({ error: blockError.message }, { status: 500 });
  }

  // Muting someone almost always means the message in front of the Host should
  // go too — doing both in one action is the difference between moderating a
  // live room and falling behind it.
  const hidden = await setMessageStatus(messageId, "hidden", host.userId);
  if (hidden) await emitHidden(hidden);

  return NextResponse.json({ ok: true });
}
