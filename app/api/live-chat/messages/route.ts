// Posting and reading chat messages.
//
// This is the route that decides what lands in a room full of strangers under a
// church livestream, so the order of checks is deliberate:
//
//   1. Is there a room, and is it open?      — cheapest, and settles most calls
//   2. Who is asking?                        — signed cookie or Supabase session
//   3. Are they muted?                       — before anything they typed is read
//   4. Are they going too fast?              — before the filter, so a flooder
//                                              can't use the filter as a CPU sink
//   5. What did they say?                    — allow / hold / reject
//
// Only then does anything reach the database. A handler that reads the body
// before establishing the caller is the bug this ordering exists to prevent.

import { NextResponse } from "next/server";
import {
  getSessionById,
  insertMessage,
  emitMessage,
  listMessages,
  toPublicMessage,
  toHostMessage,
  type ChatChannel,
} from "@/lib/liveChat.server";
import {
  readGuest,
  readHost,
  isGuestBlocked,
  clientIp,
} from "@/lib/liveChatAuth";
import { screenMessage, checkChatRateLimit } from "@/lib/liveChatModeration";

export const dynamic = "force-dynamic";

const CHANNELS: ChatChannel[] = ["public", "backstage", "direct"];

function isChannel(value: unknown): value is ChatChannel {
  return typeof value === "string" && CHANNELS.includes(value as ChatChannel);
}

// ── Read ────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session");
  const channelParam = url.searchParams.get("channel") ?? "public";

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session." }, { status: 400 });
  }
  if (!isChannel(channelParam)) {
    return NextResponse.json({ error: "Unknown channel." }, { status: 400 });
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "No such chat." }, { status: 404 });
  }

  const [guest, host] = await Promise.all([readGuest(), readHost()]);

  // Backstage is host-only, and a direct thread is the Host's or its owner's.
  if (channelParam === "backstage" && !host) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let threadKey: string | null = null;
  if (channelParam === "direct") {
    const requested = url.searchParams.get("thread");
    if (host) {
      if (!requested) {
        return NextResponse.json({ error: "Missing thread." }, { status: 400 });
      }
      threadKey = requested;
    } else {
      if (!guest) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      // A guest reads their own thread and no other — the key comes from the
      // signed cookie, never from the query string.
      threadKey = guest.id;
    }
  }

  const rows = await listMessages({
    sessionId,
    channel: channelParam,
    threadKey,
    asHost: Boolean(host),
    forGuestId: guest?.id ?? null,
  });

  return NextResponse.json(
    {
      messages: rows.map((row) => (host ? toHostMessage(row) : toPublicMessage(row))),
      state: session.state,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

// ── Write ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: { session?: unknown; channel?: unknown; body?: unknown; thread?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const sessionId = typeof body.session === "string" ? body.session : "";
  const channel = isChannel(body.channel) ? body.channel : "public";

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session." }, { status: 400 });
  }

  // 1. Is there a room, and is it open?
  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "No such chat." }, { status: 404 });
  }
  if (session.state === "closed") {
    return NextResponse.json({ error: "The chat is closed." }, { status: 409 });
  }

  // 2. Who is asking?
  const [guest, host] = await Promise.all([readGuest(), readHost()]);

  // Hosts keep posting while the room is paused — pausing is how they get a
  // word in over the noise, so silencing them too would defeat it.
  if (session.state === "paused" && !host) {
    return NextResponse.json(
      { error: "A host has paused the chat." },
      { status: 409 },
    );
  }

  if (channel === "backstage" && !host) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!host && !guest) {
    return NextResponse.json(
      { error: "Choose a name before joining in." },
      { status: 401 },
    );
  }

  // Direct threads: a Host names the thread, a guest can only be in their own.
  let threadKey: string | null = null;
  if (channel === "direct") {
    if (host) {
      threadKey = typeof body.thread === "string" ? body.thread : "";
      if (!threadKey) {
        return NextResponse.json({ error: "Missing thread." }, { status: 400 });
      }
    } else {
      threadKey = guest!.id;
    }
  }

  // 3. Muted?
  if (!host && guest && (await isGuestBlocked(guest.id, sessionId))) {
    // Deliberately vague, and deliberately not an error the UI shouts about:
    // someone who knows exactly when they were muted just clears cookies.
    return NextResponse.json(
      { error: "Your message couldn't be sent." },
      { status: 403 },
    );
  }

  // 4. Too fast?
  if (!host) {
    const key = `${guest!.id}:${clientIp(request)}`;
    const { allowed, retryAfterSeconds } = checkChatRateLimit(key);
    if (!allowed) {
      return NextResponse.json(
        { error: `Slow down a moment — try again in ${retryAfterSeconds}s.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }
  }

  // 5. What did they say?
  const verdict = screenMessage(
    typeof body.body === "string" ? body.body : "",
    host ? "host" : "guest",
  );
  if (verdict.action === "reject") {
    return NextResponse.json({ error: verdict.reason }, { status: 400 });
  }

  const row = await insertMessage({
    sessionId,
    channel,
    threadKey,
    authorKind: host ? "host" : "guest",
    authorGuestId: host ? null : guest!.id,
    authorUserId: host ? host.userId : null,
    displayName: host ? host.name : guest!.name,
    body: verdict.body,
    status: verdict.action === "hold" ? "held" : "visible",
    heldReason: verdict.action === "hold" ? verdict.reason : null,
  });

  if (!row) {
    return NextResponse.json({ error: "Couldn't send that message." }, { status: 500 });
  }

  await emitMessage(row);

  // The sender always gets their own message back, held or not, so it appears in
  // their own transcript and they don't retype it. `held` tells the UI to mark
  // it as waiting — without saying which word tripped, because a filter you can
  // probe is a filter you can walk around.
  return NextResponse.json(
    { message: toPublicMessage(row), held: row.status === "held" },
    { status: 201 },
  );
}
