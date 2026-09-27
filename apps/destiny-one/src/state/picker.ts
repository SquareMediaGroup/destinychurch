// The people chosen on the Add people screen, shared with New group (which
// opens the picker and reads the selection back). A tiny external store
// rather than route params, because a selection of 20 people doesn't belong in
// a URL.

import { useSyncExternalStore } from "react";
import type { D1DirectoryEntry } from "@destiny/shared";

let picked: D1DirectoryEntry[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const picker = {
  get: () => picked,
  set(next: D1DirectoryEntry[]) {
    picked = next;
    emit();
  },
  toggle(entry: D1DirectoryEntry) {
    picker.set(picked.some((p) => p.id === entry.id) ? picked.filter((p) => p.id !== entry.id) : [...picked, entry]);
  },
  clear: () => picker.set([]),
};

export function usePicked(): D1DirectoryEntry[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => picked,
  );
}
