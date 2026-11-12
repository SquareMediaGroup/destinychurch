// A passage chosen on the Verse screen, read back by whoever opened it: a chat
// (which sends it as a message, so it gets a verse card) or a sermon note (which
// adds it). Addressed to one target, like state/pollDraft.ts.

import { useSyncExternalStore } from "react";

let picked: { target: string; label: string } | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const verseDraft = {
  set(target: string, label: string) {
    picked = { target, label };
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

/** The reference ("John 3:16") waiting for this target, if any. */
export function useVerseDraft(target: string): string | null {
  return useSyncExternalStore(subscribe, () => (picked?.target === target ? picked.label : null));
}
