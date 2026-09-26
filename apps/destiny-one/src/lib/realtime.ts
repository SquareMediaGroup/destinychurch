// Live updates over Supabase Realtime (private Broadcast channels).
//
//   d1-group:<group id>   — new/deleted messages, reactions, member changes,
//                           freeze state. Only current members can join.
//   d1-member:<member id> — "you were added to / removed from a group".
//
// The server authorises every subscription against group membership, so
// joining someone else's topic simply fails. The app only listens; it never
// broadcasts — all writes go through the API.

import type { RealtimeChannel } from "@supabase/supabase-js";
import type { D1RealtimeEvent } from "@destiny/shared";
import { supabase } from "@/lib/supabase";

type Handler = (event: D1RealtimeEvent) => void;

async function subscribe(topic: string, onEvent: Handler): Promise<() => void> {
  // Private channels authorise with the user's JWT.
  await supabase.realtime.setAuth();
  const channel: RealtimeChannel = supabase
    .channel(topic, { config: { private: true } })
    .on("broadcast", { event: "*" }, ({ event, payload }) => {
      onEvent({ event, payload } as D1RealtimeEvent);
    })
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToGroup(groupId: string, onEvent: Handler) {
  return subscribe(`d1-group:${groupId}`, onEvent);
}

export function subscribeToMe(memberId: string, onEvent: Handler) {
  return subscribe(`d1-member:${memberId}`, onEvent);
}
