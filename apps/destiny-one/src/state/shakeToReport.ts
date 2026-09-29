// Whether shaking the phone offers "Report a problem". On by default; switched
// off from the Report a problem screen or the shake prompt itself. Kept on
// this phone only, like the appearance settings.

import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "d1.shakeToReport.v1";

let enabled = true;
const listeners = new Set<() => void>();

export const shakeToReport = {
  get: () => enabled,
  set(on: boolean) {
    enabled = on;
    for (const l of listeners) l();
    AsyncStorage.setItem(KEY, on ? "1" : "0").catch(() => undefined); // not being saved is fine; it resets to on next launch
  },
  async load() {
    const saved = await AsyncStorage.getItem(KEY).catch(() => null);
    if (saved !== null && (saved === "1") !== enabled) shakeToReport.set(saved === "1");
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useShakeToReport(): boolean {
  return useSyncExternalStore(shakeToReport.subscribe, shakeToReport.get);
}
