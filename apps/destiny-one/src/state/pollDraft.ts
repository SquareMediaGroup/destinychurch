// A poll composed on the Poll screen, read back by the group chat screen that
// opened it. A tiny external store rather than route params, matching
// state/picker.ts — a poll draft doesn't belong in a URL.
//
// The draft is addressed to one group. More than one chat can be mounted at
// once (chat A → info → search → chat B), and each would otherwise send the
// same poll into its own group.

import { useSyncExternalStore } from "react";
import type { D1PollDraft } from "@destiny/shared";

let draft: { groupId: string; poll: D1PollDraft } | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const pollDraft = {
  set(groupId: string, poll: D1PollDraft) {
    draft = { groupId, poll };
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

/** The poll waiting to be sent into this group, if any. */
export function usePollDraft(groupId: string): D1PollDraft | null {
  return useSyncExternalStore(subscribe, () => (draft?.groupId === groupId ? draft.poll : null));
}
