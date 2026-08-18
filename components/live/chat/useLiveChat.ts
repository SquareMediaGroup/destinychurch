"use client";

// The one place the chat talks to Supabase Realtime.
//
// This is the first websocket in the codebase — everything else that needed
// fresh data polls (contexts/LiveContext.tsx) or streams NDJSON
// (app/api/chat/route.ts). Two consequences worth knowing:
//
//   The client must be the memoised one. lib/supabase-browser.ts caches a single
//   instance; utils/supabase/client.ts builds a new one per call, and a new
//   client means a new websocket. Mounting the panel with the wrong import opens
//   a socket per render.
//
//   Subscribing is receive-only. The RLS policies on realtime.messages
//   (supabase/migrations/20260817_live_chat.sql) grant SELECT on these topics and
//   deliberately grant no broadcast INSERT, so `.send()` from here would simply
//   fail. Sending goes over HTTP to /api/live-chat/messages, gets moderated, and
//   comes back down the channel. That round trip is the feature, not an
//   oversight.

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export interface ChatMessage {
  id: string;
  channel: "public" | "backstage" | "direct";
  authorKind: "guest" | "host";
  displayName: string;
  body: string;
  createdAt: string;
  /** Set locally on the sender's own copy of a held message. */
  pending?: boolean;
  status?: "visible" | "held" | "hidden";
  heldReason?: string | null;
  guestId?: string | null;
  threadKey?: string | null;
}

export type ChatState = "closed" | "open" | "paused";

interface Options {
  topic: string | null;
  onMessage: (message: ChatMessage) => void;
  onHide?: (id: string) => void;
  onState?: (state: ChatState) => void;
  onPrayer?: (request: unknown) => void;
  /** Presence gives the "watching together" count. Public topic only. */
  withPresence?: boolean;
}

export function useLiveChat({
  topic,
  onMessage,
  onHide,
  onState,
  onPrayer,
  withPresence = false,
}: Options) {
  const [connected, setConnected] = useState(false);
  const [viewers, setViewers] = useState(0);

  // Handlers are held in refs so the effect can key on `topic` alone. Keying it
  // on the callbacks would tear the socket down and rebuild it on every parent
  // render — mid-service, which is exactly when it must not happen.
  const handlers = useRef({ onMessage, onHide, onState, onPrayer });
  useEffect(() => {
    handlers.current = { onMessage, onHide, onState, onPrayer };
  }, [onMessage, onHide, onState, onPrayer]);

  useEffect(() => {
    // No early setConnected here: when the topic goes away the *previous* run's
    // cleanup has already flipped it false, and setting state in an effect body
    // costs a cascading render for nothing.
    if (!topic) return;

    const supabase = getSupabaseBrowserClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      // Required for private channels: it hands the socket the current JWT
      // (the anon key for a guest, the session token for a signed-in Host) so
      // the realtime.messages policies have a role to evaluate against.
      await supabase.realtime.setAuth();
      if (cancelled) return;

      channel = supabase.channel(topic, { config: { private: true } });

      channel
        .on("broadcast", { event: "message" }, ({ payload }) => {
          const message = (payload as { message?: ChatMessage })?.message;
          if (message) handlers.current.onMessage(message);
        })
        .on("broadcast", { event: "hide" }, ({ payload }) => {
          const id = (payload as { id?: string })?.id;
          if (id) handlers.current.onHide?.(id);
        })
        .on("broadcast", { event: "state" }, ({ payload }) => {
          const state = (payload as { state?: ChatState })?.state;
          if (state) handlers.current.onState?.(state);
        })
        .on("broadcast", { event: "prayer" }, ({ payload }) => {
          handlers.current.onPrayer?.((payload as { request?: unknown })?.request);
        });

      if (withPresence) {
        channel.on("presence", { event: "sync" }, () => {
          setViewers(Object.keys(channel?.presenceState() ?? {}).length);
        });
      }

      channel.subscribe((status) => {
        if (cancelled) return;
        const live = status === "SUBSCRIBED";
        setConnected(live);
        // Presence is the one thing a client may write here, and only after the
        // channel is up. There is no identifying payload — the count is the
        // whole point, not who is in it.
        if (live && withPresence) {
          void channel?.track({ at: Date.now() });
        }
      });
    })();

    return () => {
      cancelled = true;
      setConnected(false);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [topic, withPresence]);

  return { connected, viewers };
}

/**
 * Append a message, ignoring one we already have.
 *
 * The sender gets their message twice — once as the POST response, once off the
 * channel — and duplicates in a chat log are the most obvious possible bug.
 */
export function mergeMessage(list: ChatMessage[], next: ChatMessage): ChatMessage[] {
  const at = list.findIndex((m) => m.id === next.id);
  if (at === -1) return [...list, next];
  const copy = [...list];
  copy[at] = { ...copy[at], ...next };
  return copy;
}

