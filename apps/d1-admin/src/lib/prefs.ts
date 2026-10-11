// This Mac's preferences. Per device and not sensitive, so localStorage (the
// app's own origin) is fine; nothing here is a permission.

import { useSyncExternalStore } from "react";

export interface Prefs {
  theme: "light" | "dark" | "system";
  notifications: boolean;
  previews: boolean;
  touchId: boolean;
  /** Epoch ms until which banners are paused ("Pause notifications for 1 hour"). */
  pausedUntil: number;
}

const KEY = "d1admin.prefs.v1";
const DEFAULTS: Prefs = { theme: "system", notifications: true, previews: true, touchId: true, pausedUntil: 0 };

function read(): Prefs {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs>) };
  } catch {
    return DEFAULTS;
  }
}

let current = read();
const listeners = new Set<() => void>();

export function getPrefs(): Prefs {
  return current;
}

export function setPrefs(patch: Partial<Prefs>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable: keep the change for this run.
  }
  for (const l of listeners) l();
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
}
