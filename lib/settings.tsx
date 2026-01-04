"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
export type TextSize = "normal" | "large";
export type CaptionSize = "small" | "medium" | "large";
export type ResumePreference = "resume" | "restart";

export type Settings = {
  theme: ThemePreference;
  textSize: TextSize;
  reduceMotion: boolean;
  autoplayNext: boolean;
  playbackSpeed: number;
  resumePlayback: ResumePreference;
  captionsEnabled: boolean;
  captionSize: CaptionSize;
  continueWatching: boolean;
  devMode: boolean;
};

export const SETTINGS_STORAGE_KEY = "destiny-settings";
const LEGACY_THEME_KEY = "destiny-theme";

const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  textSize: "normal",
  reduceMotion: false,
  autoplayNext: true,
  playbackSpeed: 1,
  resumePlayback: "resume",
  captionsEnabled: false,
  captionSize: "medium",
  continueWatching: true,
  devMode: false,
};

const parseBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const parseString = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;

const parseNumber = (value: unknown, allowed: number[], fallback: number) =>
  typeof value === "number" && allowed.includes(value) ? value : fallback;

const readStoredSettings = (): Settings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) {
    const legacyTheme = window.localStorage.getItem(LEGACY_THEME_KEY);
    if (legacyTheme === "light" || legacyTheme === "dark") {
      return { ...DEFAULT_SETTINGS, theme: legacyTheme };
    }
    return DEFAULT_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      theme: parseString(parsed.theme, ["system", "light", "dark"], DEFAULT_SETTINGS.theme),
      textSize: parseString(parsed.textSize, ["normal", "large"], DEFAULT_SETTINGS.textSize),
      reduceMotion: parseBoolean(parsed.reduceMotion, DEFAULT_SETTINGS.reduceMotion),
      autoplayNext: parseBoolean(parsed.autoplayNext, DEFAULT_SETTINGS.autoplayNext),
      playbackSpeed: parseNumber(parsed.playbackSpeed, [0.75, 1, 1.25, 1.5, 2], DEFAULT_SETTINGS.playbackSpeed),
      resumePlayback: parseString(parsed.resumePlayback, ["resume", "restart"], DEFAULT_SETTINGS.resumePlayback),
      captionsEnabled: parseBoolean(parsed.captionsEnabled, DEFAULT_SETTINGS.captionsEnabled),
      captionSize: parseString(parsed.captionSize, ["small", "medium", "large"], DEFAULT_SETTINGS.captionSize),
      continueWatching: parseBoolean(parsed.continueWatching, DEFAULT_SETTINGS.continueWatching),
      devMode: parseBoolean(parsed.devMode, DEFAULT_SETTINGS.devMode),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const applySettings = (settings: Settings) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (settings.theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.dataset.theme = settings.theme;
  }
  root.dataset.textSize = settings.textSize;
  root.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
  root.dataset.captionSize = settings.captionSize;
  root.dataset.devMode = settings.devMode ? "true" : "false";
};

type SettingsContextValue = {
  settings: Settings;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => void;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredSettings();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(stored);
    applySettings(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    applySettings(settings);
  }, [hydrated, settings]);

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      window.localStorage.removeItem(LEGACY_THEME_KEY);
    }
    applySettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, updateSetting, resetSettings }),
    [settings, updateSetting, resetSettings],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error("useSettings must be used within SettingsProvider");
  }
  return ctx;
}
