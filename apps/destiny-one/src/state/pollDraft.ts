// A poll composed on the Poll screen, read back by the group chat screen that
// opened it. A tiny external store rather than route params, matching
// state/picker.ts — a poll draft doesn't belong in a URL.

import { useSyncExternalStore } from "react";
import type { D1PollDraft } from "@destiny/shared";

let draft: D1PollDraft | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const pollDraft = {
  get: () => draft,
  set(next: D1PollDraft) {
    draft = next;
    emit();
  },
  clear() {
    draft = null;
    emit();
  },
};

export function usePollDraft(): D1PollDraft | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => draft,
  );
}
