// A prayer request written on the Prayer request screen, read back by the group
// chat that opened it and sent from there (so it shows in the chat at once, with
// "Not sent. Tap to retry." if it fails). Same pattern as state/pollDraft.ts,
// addressed to one group.

import { useSyncExternalStore } from "react";

let draft: { groupId: string; text: string } | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const prayerDraft = {
  set(groupId: string, text: string) {
    draft = { groupId, text };
    emit();
  },
  clear() {
    draft = null;
    emit();
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The prayer request waiting to be sent into this group, if any. */
export function usePrayerDraft(groupId: string): string | null {
  return useSyncExternalStore(subscribe, () => (draft?.groupId === groupId ? draft.text : null));
}
