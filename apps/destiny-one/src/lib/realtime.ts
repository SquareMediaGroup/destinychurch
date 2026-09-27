// Live updates over Supabase Realtime (private Broadcast channels).
//
//   d1-group:<group id>   — new/deleted messages, reactions, member changes,
//                           freeze state. Only current members can join.
//   d1-member:<member id> — "you were added to / removed from a group".
//
// One app-wide hub listens to the member topic plus EVERY group the member is
// in, not just the open chat. That's what lets the chat list and every
// cached conversation stay current without asking the server. The server
// authorises each subscription against group membership, so joining someone
// else's topic simply fails. The app only listens; all writes go through the API.
//
// Broadcast doesn't replay: anything sent while the socket was down is lost.
// When the member channel re-joins after a drop, onRejoin fires so the caller
// can catch up with one background re-fetch.

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { D1RealtimeEvent } from "@destiny/shared";
import { supabase } from "@/lib/supabase";

type Handler = (event: D1RealtimeEvent) => void;

export interface Hub {
  /** Listen to exactly these groups (joins new ones, leaves old ones). */
  setGroups: (groupIds: string[]) => void;
  stop: () => void;
}

export function startHub(memberId: string, onEvent: Handler, onRejoin: () => void): Hub {
  const channels = new Map<string, RealtimeChannel>();
  let stopped = false;
  let authed: Promise<void> | null = null;

  // Private channels authorise with the user's JWT.
  const ensureAuth = () => (authed ??= supabase.realtime.setAuth().catch(() => undefined));

  async function join(topic: string, onStatus?: (status: string) => void) {
    await ensureAuth();
    if (stopped || channels.has(topic)) return;
    const channel = supabase
      .channel(topic, { config: { private: true } })
      .on("broadcast", { event: "*" }, ({ event, payload }) => onEvent({ event, payload } as D1RealtimeEvent));
    channels.set(topic, channel);
    channel.subscribe((status) => onStatus?.(status));
  }

  function leave(topic: string) {
    const channel = channels.get(topic);
    if (!channel) return;
    channels.delete(topic);
    void supabase.removeChannel(channel);
  }

  let joinedOnce = false;
  void join(`d1-member:${memberId}`, (status) => {
    if (status !== "SUBSCRIBED") return;
    if (joinedOnce) onRejoin();
    joinedOnce = true;
  });

  return {
    setGroups(groupIds) {
      if (stopped) return;
      const want = new Set(groupIds.map((id) => `d1-group:${id}`));
      for (const topic of [...channels.keys()]) if (topic.startsWith("d1-group:") && !want.has(topic)) leave(topic);
      for (const topic of want) void join(topic);
    },
    stop() {
      stopped = true;
      for (const topic of [...channels.keys()]) leave(topic);
    },
  };
}
