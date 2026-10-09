// Who's typing in each group, from the `typing` Realtime event. Each event
// shows that person for a few seconds; another one keeps them there. Memory
// only, never cached: it's only true for a moment.
//
// Sending: typingPing() calls the API at most once per PING_MS per group, so a
// whole message costs a handful of calls.

import { useSyncExternalStore } from "react";
import { api } from "@/lib/api";

/** How long one ping keeps someone shown as typing. */
const SHOW_MS = 6000;
/** At most one ping per group this often. Under SHOW_MS, so a steady typist doesn't flicker. */
const PING_MS = 4000;

type Typist = { memberId: string; name: string; until: number };
let byGroup = new Map<string, Typist[]>();
const listeners = new Set<() => void>();
const lastPing = new Map<string, number>();
let timer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l();
}

/** Drop anyone whose time is up, and come back when the next one's is. */
function sweep() {
  timer = null;
  const now = Date.now();
  let changed = false;
  const next = new Map<string, Typist[]>();
  for (const [g, list] of byGroup) {
    const live = list.filter((x) => x.until > now);
    if (live.length !== list.length) changed = true;
    if (live.length) next.set(g, live);
  }
  if (changed) {
    byGroup = next;
    emit();
  }
  const soonest = Math.min(...[...byGroup.values()].flat().map((x) => x.until));
  if (Number.isFinite(soonest)) timer = setTimeout(sweep, Math.max(50, soonest - now));
}

export const typing = {
  /** A `typing` event arrived. */
  seen(groupId: string, memberId: string, name: string) {
    const list = (byGroup.get(groupId) ?? []).filter((x) => x.memberId !== memberId);
    byGroup = new Map(byGroup).set(groupId, [...list, { memberId, name, until: Date.now() + SHOW_MS }]);
    emit();
    if (!timer) timer = setTimeout(sweep, SHOW_MS);
  },
  /** Their message arrived: they've stopped typing it. */
  stopped(groupId: string, memberId: string) {
    const list = byGroup.get(groupId);
    if (!list?.some((x) => x.memberId === memberId)) return;
    byGroup = new Map(byGroup).set(groupId, list.filter((x) => x.memberId !== memberId));
    emit();
  },
  clear() {
    byGroup = new Map();
    emit();
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const NONE: Typist[] = [];
/** Names of the people typing in this group right now (never me: the server only echoes others'). */
export function useTyping(groupId: string): string[] {
  const list = useSyncExternalStore(subscribe, () => byGroup.get(groupId) ?? NONE);
  return list.map((x) => x.name);
}

/** Tell the group I'm typing, at most once every PING_MS. Fire and forget. */
export function typingPing(groupId: string) {
  const now = Date.now();
  if (now - (lastPing.get(groupId) ?? 0) < PING_MS) return;
  lastPing.set(groupId, now);
  void api.typing(groupId).catch(() => undefined);
}

/** "Leah is typing…", "Leah and Sam are typing…", "3 people are typing…". */
export function typingLabel(names: string[]): string | null {
  const first = names.map((n) => n.split(" ")[0]);
  if (first.length === 0) return null;
  if (first.length === 1) return `${first[0]} is typing…`;
  if (first.length === 2) return `${first[0]} and ${first[1]} are typing…`;
  return `${first.length} people are typing…`;
}
