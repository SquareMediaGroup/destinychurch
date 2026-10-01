// A ChurchSuite event chosen on the Event picker screen, read back by the
// group chat screen that opened it. Same tiny-external-store pattern as
// state/picker.ts and state/pollDraft.ts, and like a poll draft it's addressed
// to one group, so a second chat further down the stack doesn't send it too.

import { useSyncExternalStore } from "react";
import type { D1EventSummary } from "@destiny/shared";

let picked: { groupId: string; event: D1EventSummary } | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const eventPick = {
  set(groupId: string, event: D1EventSummary) {
    picked = { groupId, event };
    emit();
  },
  clear() {
    picked = null;
    emit();
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The event waiting to be shared into this group, if any. */
export function useEventPick(groupId: string): D1EventSummary | null {
  return useSyncExternalStore(subscribe, () => (picked?.groupId === groupId ? picked.event : null));
}
