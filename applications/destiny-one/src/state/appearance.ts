// The person's own look for chats: send colour and conversation wallpaper.
// Kept on this phone only (AsyncStorage), as a tiny external store so every
// screen re-renders the moment it changes, including the live preview.

import { useSyncExternalStore } from "react";
import { Appearance as SystemAppearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CUSTOM_WALLPAPER, DEFAULT_BLUR, DEFAULT_DIM, DEFAULT_SEND_COLOUR, DEFAULT_WALLPAPER, MAX_DIM, PHOTO_WALLPAPERS, SEND_COLOURS, WALLPAPERS, unit } from "@/theme/appearance";

/** "black" is True dark: the near-black look. It is a dark scheme as far as the phone is concerned. */
export type ThemeMode = "system" | "light" | "dark" | "black";
const MODES: readonly ThemeMode[] = ["system", "light", "dark", "black"];

export interface Appearance {
  mode: ThemeMode;
  sendColour: string;
  /** A pattern id, `photo:<key>`, or "custom" (the person's own photo, see `customFile`). */
  wallpaper: string;
  /** How far a photo wallpaper is dimmed (faded toward the page colour), 0 to MAX_DIM. */
  dim: number;
  /** How blurred a photo wallpaper is, 0 to 1. */
  blur: number;
  /** File name of the person's own wallpaper photo in the app's documents folder. */
  customFile: string | null;
}

const KEY = "d1.appearance.v1";
const DEFAULTS: Appearance = { mode: "system", sendColour: DEFAULT_SEND_COLOUR, wallpaper: DEFAULT_WALLPAPER, dim: DEFAULT_DIM, blur: DEFAULT_BLUR, customFile: null };

let current: Appearance = DEFAULTS;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Light or dark for the whole app, including native pieces (glass, keyboard, alerts). "system" follows the phone. */
function applyMode() {
  SystemAppearance.setColorScheme(current.mode === "system" ? "unspecified" : current.mode === "black" ? "dark" : current.mode);
}

function save() {
  AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => undefined); // not being saved is fine; it just resets next launch
}

/** Only ids we still ship: a removed option falls back to the default. */
function sanitise(raw: unknown): Appearance {
  const r = (raw ?? {}) as Partial<Appearance>;
  const customFile = typeof r.customFile === "string" && /^wallpaper-\d+\.jpg$/.test(r.customFile) ? r.customFile : null;
  const known = WALLPAPERS.some((w) => w.id === r.wallpaper) || PHOTO_WALLPAPERS.some((p) => p.id === r.wallpaper) || (r.wallpaper === CUSTOM_WALLPAPER && customFile !== null);
  return {
    mode: MODES.includes(r.mode as ThemeMode) ? (r.mode as ThemeMode) : DEFAULTS.mode,
    sendColour: SEND_COLOURS.some((c) => c.id === r.sendColour) ? (r.sendColour as string) : DEFAULTS.sendColour,
    wallpaper: known ? (r.wallpaper as string) : DEFAULTS.wallpaper,
    dim: unit(r.dim, DEFAULTS.dim, MAX_DIM),
    blur: unit(r.blur, DEFAULTS.blur),
    customFile,
  };
}

export const appearance = {
  get: () => current,
  set(patch: Partial<Appearance>) {
    current = sanitise({ ...current, ...patch });
    applyMode();
    emit();
    save();
  },
  reset() {
    current = DEFAULTS;
    applyMode();
    emit();
    save();
  },
  /** Called once at launch. */
  async load() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) {
        current = sanitise(JSON.parse(raw));
        applyMode();
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
