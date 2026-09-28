// The person's own look for chats: send colour and conversation wallpaper.
// Kept on this phone only (AsyncStorage), as a tiny external store so every
// screen re-renders the moment it changes, including the live preview.

import { useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_SEND_COLOUR, DEFAULT_WALLPAPER, SEND_COLOURS, WALLPAPERS } from "@/theme/appearance";

export interface Appearance {
  sendColour: string;
  wallpaper: string;
}

const KEY = "d1.appearance.v1";
const DEFAULTS: Appearance = { sendColour: DEFAULT_SEND_COLOUR, wallpaper: DEFAULT_WALLPAPER };

let current: Appearance = DEFAULTS;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function save() {
  AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => undefined); // not being saved is fine; it just resets next launch
}

/** Only ids we still ship: a removed option falls back to the default. */
function sanitise(raw: unknown): Appearance {
  const r = (raw ?? {}) as Partial<Appearance>;
  return {
    sendColour: SEND_COLOURS.some((c) => c.id === r.sendColour) ? (r.sendColour as string) : DEFAULTS.sendColour,
    wallpaper: WALLPAPERS.some((w) => w.id === r.wallpaper) ? (r.wallpaper as string) : DEFAULTS.wallpaper,
  };
}

export const appearance = {
  get: () => current,
  set(patch: Partial<Appearance>) {
    current = sanitise({ ...current, ...patch });
    emit();
    save();
  },
  reset() {
    current = DEFAULTS;
    emit();
    save();
  },
  /** Called once at launch. */
  async load() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        current = sanitise(JSON.parse(raw));
        emit();
      }
    } catch {
      // unreadable: keep the defaults
    }
  },
};

export function useAppearance(): Appearance {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => current,
  );
}
