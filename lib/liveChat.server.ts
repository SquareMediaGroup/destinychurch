// The live chat data layer. Everything that touches the live_chat_* tables goes
// through here so the eleven routes above it stay thin and, more importantly, so
// there is exactly one place that decides what a message looks like on the way
// out.
//
// That last part matters more than it sounds. The public channel, the Host
// channel and a direct thread carry the same rows to very different audiences,
// and the difference between them is one field. Keeping the serialisers next to
// each other makes "does this leak?" a question you can answer by reading twenty
// lines rather than by auditing every route.

import "server-only";
import { createServiceClient } from "@/utils/supabase/service";
import { getLiveStatus } from "@/lib/liveStatus.server";
import { publicTopic, hostTopic, dmTopic } from "@/lib/liveChatGuest";

export type ChatChannel = "public" | "backstage" | "direct";
export type ChatState = "closed" | "open" | "paused";

export interface ChatSession {
  id: string;
  video_id: string | null;
  title: string | null;
  state: ChatState;
  opened_at: string | null;
  closed_at: string | null;
}

export interface ChatMessageRow {
  id: string;
  session_id: string;
  channel: ChatChannel;
  thread_key: string | null;
  author_kind: "guest" | "host";
  author_guest_id: string | null;
  author_user_id: string | null;
  display_name: string;
  body: string;
  status: "visible" | "held" | "hidden";
  held_reason: string | null;
  created_at: string;
}

/**
 * What everyone in the room sees.
 *
 * Deliberately no guest id: knowing one buys an attacker nothing (the cookie is
 * signed and the DM key is an HMAC), but broadcasting a stable per-person
 * identifier to every viewer would let anyone correlate a person's messages
 * across services, and there is no feature here that needs it. Hosts moderate by
 * message id and the server resolves the author itself.
 */
export interface PublicMessage {
  id: string;
  channel: ChatChannel;
  authorKind: "guest" | "host";
  displayName: string;
  body: string;
  createdAt: string;
}

/** The Host view: adds the moderation state and who said it. */
export interface HostMessage extends PublicMessage {
  status: "visible" | "held" | "hidden";
  heldReason: string | null;
  guestId: string | null;
  threadKey: string | null;
}

export function toPublicMessage(row: ChatMessageRow): PublicMessage {
  return {
    id: row.id,
    channel: row.channel,
    authorKind: row.author_kind,
    displayName: row.display_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

export function toHostMessage(row: ChatMessageRow): HostMessage {
  return {
    ...toPublicMessage(row),
    status: row.status,
    heldReason: row.held_reason,
    guestId: row.author_guest_id,
    threadKey: row.thread_key,
  };
}

// ── Sessions ────────────────────────────────────────────────────────────────

export async function getSessionById(id: string): Promise<ChatSession | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("live_chat_sessions")
    .select("id, video_id, title, state, opened_at, closed_at")
    .eq("id", id)
    .maybeSingle();
  return (data as ChatSession) ?? null;
}

export async function getSessionByVideoId(videoId: string): Promise<ChatSession | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("live_chat_sessions")
    .select("id, video_id, title, state, opened_at, closed_at")
    .eq("video_id", videoId)
    .maybeSingle();
  return (data as ChatSession) ?? null;
}

/**
 * The room for the broadcast that is on air right now, opening one if this is
 * the first person through the door.
 *
 * The live check is the guard, not a convenience: without it this is an
 * unauthenticated "create a row" endpoint that anyone could call in a loop with
 * made-up video ids. Auto-opening is worth that care — a chat that only exists
 * once someone remembers to press a button is a chat that is empty for the first
 * ten minutes of every service.
 */
export async function getOrOpenCurrentSession(): Promise<ChatSession | null> {
  const status = await getLiveStatus();
  if (!status.live || !status.videoId) return null;

  const existing = await getSessionByVideoId(status.videoId);
  if (existing) return existing;

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("live_chat_sessions")
    .insert({
      video_id: status.videoId,
      title: status.title ?? null,
      state: "open",
      opened_at: new Date().toISOString(),
    })
    .select("id, video_id, title, state, opened_at, closed_at")
    .single();

  // Two viewers can land here at the same moment; the unique index on video_id
  // decides it and the loser just reads the winner's row.
  if (error) return getSessionByVideoId(status.videoId);
  return data as ChatSession;
}

export async function setSessionState(
  sessionId: string,
  state: ChatState,
): Promise<ChatSession | null> {
  const supabase = createServiceClient();
  const patch: Record<string, unknown> = {
    state,
    updated_at: new Date().toISOString(),
  };
  if (state === "open") patch.opened_at = new Date().toISOString();
  if (state === "closed") patch.closed_at = new Date().toISOString();

  const { data } = await supabase
    .from("live_chat_sessions")
    .update(patch)
    .eq("id", sessionId)
    .select("id, video_id, title, state, opened_at, closed_at")
    .maybeSingle();

  const session = (data as ChatSession) ?? null;
  if (session) {
    // Everyone in the room needs to know immediately — a paused composer that
    // only finds out on the next poll will happily accept a message that the
    // server then rejects.
    await emit(publicTopic(sessionId), "state", { state });
    await emit(hostTopic(sessionId), "state", { state });
  }
  return session;
}

// ── Emit ────────────────────────────────────────────────────────────────────

/**
 * Push one event onto a Realtime topic.
 *
 * Errors are swallowed on purpose. A message that is safely in the database but
 * failed to broadcast is a message that shows up a moment late, when the client
 * next fetches history — annoying. A message that was rejected because the
 * broadcast failed is a message the sender has to retype — worse. So delivery is
 * best-effort and the database is the source of truth.
 */
export async function emit(
  topic: string,
  event: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.rpc("live_chat_emit", {
    topic,
    event,
    payload,
  });
  if (error) {
    console.error(`⚠️ live chat broadcast failed [${topic}/${event}]:`, error.message);
  }
}

/** Fan a newly-stored message out to whoever is entitled to it. */
export async function emitMessage(row: ChatMessageRow): Promise<void> {
  const host = hostTopic(row.session_id);

  // Hosts see everything on their own channel, including held messages — that
  // channel *is* the moderation queue.
  await emit(host, "message", { message: toHostMessage(row) });

  if (row.status !== "visible") return;

  if (row.channel === "public") {
    await emit(publicTopic(row.session_id), "message", {
      message: toPublicMessage(row),
    });
    return;
  }

  if (row.channel === "direct" && row.thread_key) {
    await emit(dmTopic(row.session_id, row.thread_key), "message", {
      message: toPublicMessage(row),
    });
  }
  // `backstage` needs no second emit: the host topic above already carried it.
}

export async function emitHidden(row: ChatMessageRow): Promise<void> {
  await emit(hostTopic(row.session_id), "moderated", {
    id: row.id,
    status: row.status,
  });
  if (row.channel === "public") {
    await emit(publicTopic(row.session_id), "hide", { id: row.id });
  } else if (row.channel === "direct" && row.thread_key) {
    await emit(dmTopic(row.session_id, row.thread_key), "hide", { id: row.id });
  }
}

// ── Messages ────────────────────────────────────────────────────────────────

const MESSAGE_COLUMNS =
  "id, session_id, channel, thread_key, author_kind, author_guest_id, author_user_id, display_name, body, status, held_reason, created_at";

export async function insertMessage(input: {
  sessionId: string;
  channel: ChatChannel;
  threadKey?: string | null;
  authorKind: "guest" | "host";
  authorGuestId?: string | null;
  authorUserId?: string | null;
  displayName: string;
  body: string;
  status: "visible" | "held";
  heldReason?: string | null;
}): Promise<ChatMessageRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("live_chat_messages")
    .insert({
      session_id: input.sessionId,
      channel: input.channel,
      thread_key: input.threadKey ?? null,
      author_kind: input.authorKind,
      author_guest_id: input.authorGuestId ?? null,
      author_user_id: input.authorUserId ?? null,
      display_name: input.displayName,
      body: input.body,
      status: input.status,
      held_reason: input.heldReason ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) {
    console.error("⚠️ live chat insert failed:", error.message);
    return null;
  }
  return data as ChatMessageRow;
}

/**
 * Recent history for a channel.
 *
 * `forGuestId` is what makes a held message visible to the person who wrote it
 * and to nobody else: without it a held message vanishes mid-conversation and
 * the sender retypes it, which is exactly the behaviour holding was meant to
 * avoid.
 */
export async function listMessages(opts: {
  sessionId: string;
  channel: ChatChannel;
  threadKey?: string | null;
  limit?: number;
  asHost?: boolean;
  forGuestId?: string | null;
}): Promise<ChatMessageRow[]> {
  const supabase = createServiceClient();
  let query = supabase
    .from("live_chat_messages")
    .select(MESSAGE_COLUMNS)
    .eq("session_id", opts.sessionId)
    .eq("channel", opts.channel)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);

  if (opts.threadKey) query = query.eq("thread_key", opts.threadKey);
  if (!opts.asHost) query = query.neq("status", "hidden");

  const { data } = await query;
  const rows = ((data as ChatMessageRow[]) ?? []).reverse();

  if (opts.asHost) return rows;

  return rows.filter(
    (row) =>
      row.status === "visible" ||
      (row.status === "held" && row.author_guest_id === opts.forGuestId),
  );
}

export async function listHeld(sessionId: string): Promise<ChatMessageRow[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("live_chat_messages")
    .select(MESSAGE_COLUMNS)
    .eq("session_id", sessionId)
    .eq("status", "held")
    .order("created_at", { ascending: true });
  return (data as ChatMessageRow[]) ?? [];
}

export async function setMessageStatus(
  messageId: string,
  status: "visible" | "hidden",
  moderatorUserId: string,
): Promise<ChatMessageRow | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("live_chat_messages")
    .update({
      status,
      moderated_by: moderatorUserId,
      moderated_at: new Date().toISOString(),
    })
    .eq("id", messageId)
    .select(MESSAGE_COLUMNS)
    .maybeSingle();
  return (data as ChatMessageRow) ?? null;
}

/** The distinct guests with a direct thread open in this session. */
export async function listThreads(
  sessionId: string,
): Promise<{ threadKey: string; displayName: string; lastAt: string }[]> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("live_chat_messages")
    .select("thread_key, display_name, created_at, author_kind")
    .eq("session_id", sessionId)
    .eq("channel", "direct")
    .order("created_at", { ascending: false })
    .limit(500);

  const seen = new Map<string, { threadKey: string; displayName: string; lastAt: string }>();
  for (const row of (data ?? []) as {
    thread_key: string | null;
    display_name: string;
    created_at: string;
    author_kind: string;
  }[]) {
    if (!row.thread_key || seen.has(row.thread_key)) continue;
    seen.set(row.thread_key, {
      threadKey: row.thread_key,
      // Prefer the guest's own name over the Host's for the thread label.
      displayName: row.author_kind === "guest" ? row.display_name : "Guest",
      lastAt: row.created_at,
    });
  }
  return [...seen.values()];
}
