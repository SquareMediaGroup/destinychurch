// Asking for prayer.
//
// This never touches the public channel. It is a separate table and a separate
// route from the chat on purpose — someone asking for prayer during a service is
// often telling a room of strangers something they would not post, and the one
// failure that must be impossible is this ending up in public chat by accident.
// A table boundary makes that impossible rather than merely unlikely.
//
// The only broadcast is to the Host topic, so a prayer team watching the console
// sees it arrive without polling.

import { NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { getSessionById, emit } from "@/lib/liveChat.server";
import { hostTopic } from "@/lib/liveChatGuest";
import { readGuest, readHost, clientIp } from "@/lib/liveChatAuth";
import {
  normaliseBody,
  screenDisplayName,
  checkChatRateLimit,
} from "@/lib/liveChatModeration";

export const dynamic = "force-dynamic";

const MAX_PRAYER_LENGTH = 1000;

export async function POST(request: Request) {
  let body: { session?: unknown; body?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const sessionId = typeof body.session === "string" ? body.session : "";
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session." }, { status: 400 });
  }

  const session = await getSessionById(sessionId);
  if (!session) {
    return NextResponse.json({ error: "No such chat." }, { status: 404 });
  }

  const [guest, host] = await Promise.all([readGuest(), readHost()]);

  // A name is required, but an account is not — someone can send a request the
  // moment they arrive, using whatever name they give here.
  const rawName =
    typeof body.name === "string" && body.name.trim()
      ? body.name
      : (guest?.name ?? host?.name ?? "");
  const nameVerdict = screenDisplayName(rawName);
  if (!nameVerdict.ok) {
    return NextResponse.json({ error: nameVerdict.reason }, { status: 400 });
  }

  const text = normaliseBody(typeof body.body === "string" ? body.body : "");
  if (!text) {
    return NextResponse.json(
      { error: "Tell us what to pray for." },
      { status: 400 },
    );
  }
  if (text.length > MAX_PRAYER_LENGTH) {
    return NextResponse.json(
      { error: `Please keep it under ${MAX_PRAYER_LENGTH} characters.` },
      { status: 400 },
    );
  }

  // Rate limited, but not word-filtered. A prayer request is exactly where
  // someone might use the words the chat filter holds — "I want to die" is the
  // most important message this feature will ever carry, and it must reach a
  // human immediately rather than sit in a moderation queue.
  const { allowed, retryAfterSeconds } = checkChatRateLimit(
    `prayer:${guest?.id ?? clientIp(request)}`,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: `Just a moment — try again in ${retryAfterSeconds}s.` },
      { status: 429 },
    );
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("live_chat_prayer_requests")
    .insert({
      session_id: sessionId,
      guest_id: guest?.id ?? null,
      display_name: nameVerdict.name,
      body: text,
    })
    .select("id, display_name, body, status, created_at")
    .single();

  if (error) {
    console.error("⚠️ prayer request insert failed:", error.message);
    return NextResponse.json(
      { error: "Couldn't send that just now. Please try again." },
      { status: 500 },
    );
  }

  await emit(hostTopic(sessionId), "prayer", { request: data });

  return NextResponse.json({ ok: true }, { status: 201 });
}
