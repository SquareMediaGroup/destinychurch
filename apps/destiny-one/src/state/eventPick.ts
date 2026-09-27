// A ChurchSuite event chosen on the Event picker screen, read back by the
// group chat screen that opened it. Same tiny-external-store pattern as
// state/picker.ts and state/pollDraft.ts.

import { useSyncExternalStore } from "react";
import type { D1EventSummary } from "@destiny/shared";

let picked: D1EventSummary | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const eventPick = {
  get: () => picked,
  set(next: D1EventSummary) {
    picked = next;
    emit();
  },
  clear() {
    picked = null;
    emit();
  },
};

export function useEventPick(): D1EventSummary | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => picked,
  );
}
