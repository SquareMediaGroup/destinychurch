// Whether Chats shows the verse of the day (Appearance → Verse of the day). On
// by default; a choice for this phone.

import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "d1.verseOfDay.hidden";
let hidden = false;
const listeners = new Set<() => void>();

void AsyncStorage.getItem(KEY)
  .then((v) => {
    hidden = v === "1";
    for (const l of listeners) l();
  })
  .catch(() => undefined);

export const verseOfDay = {
  setHidden(next: boolean) {
    hidden = next;
    for (const l of listeners) l();
    void AsyncStorage.setItem(KEY, next ? "1" : "0").catch(() => undefined);
  },
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useVerseOfDayHidden(): boolean {
  return useSyncExternalStore(subscribe, () => hidden);
}
