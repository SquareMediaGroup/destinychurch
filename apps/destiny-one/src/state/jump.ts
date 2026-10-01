// "Show me this message": a search result asks the chat it opens (or goes
// back to) to scroll to one message and highlight it. Same tiny-external-store
// pattern as state/pollDraft.ts, addressed to one group.

import { useSyncExternalStore } from "react";

let target: { groupId: string; messageId: number } | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const jumpTo = {
  set(groupId: string, messageId: number) {
    target = { groupId, messageId };
    emit();
  },
  clear() {
    if (!target) return;
    target = null;
    emit();
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** The message this chat has been asked to show, if any. */
export function useJumpTarget(groupId: string): number | null {
  return useSyncExternalStore(subscribe, () => (target?.groupId === groupId ? target.messageId : null));
}
