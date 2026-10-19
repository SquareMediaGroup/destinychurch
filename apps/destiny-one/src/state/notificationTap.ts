// The chat a tapped notification wants opened, waiting until the app can open
// it: on a cold start the tap arrives before anyone is signed in or the chat
// list is on screen. Same tiny-external-store pattern as state/pollDraft.ts.

import { useSyncExternalStore } from "react";

let pending: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const notificationTap = {
  set(groupId: string) {
    pending = groupId;
    emit();
  },
  clear() {
    if (pending === null) return;
    pending = null;
    emit();
  },
};

export function usePendingNotificationGroup(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pending,
  );
}
