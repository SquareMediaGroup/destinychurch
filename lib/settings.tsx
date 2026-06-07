"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type TextSize = "normal" | "large";
export type Theme = "light" | "dark";

export type Settings = {
  textSize: TextSize;
  reduceMotion: boolean;
  theme: Theme;
};

export const SETTINGS_STORAGE_KEY = "destiny-settings";

const DEFAULT_SETTINGS: Settings = {
  textSize: "normal",
  reduceMotion: false,
  // Dark mode is opt-in: every visitor starts in the light theme until they
  // flip the switch, after which their choice is remembered in localStorage.
  theme: "light",
};

const parseBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const parseString = <T extends string>(value: unknown, allowed: T[], fallback: T): T =>
  typeof value === "string" && allowed.includes(value as T) ? (value as T) : fallback;

const readStoredSettings = (): Settings => {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) return DEFAULT_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      textSize: parseString(parsed.textSize, ["normal", "large"], DEFAULT_SETTINGS.textSize),
      reduceMotion: parseBoolean(parsed.reduceMotion, DEFAULT_SETTINGS.reduceMotion),
      theme: parseString(parsed.theme, ["light", "dark"], DEFAULT_SETTINGS.theme),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const applySettings = (settings: Settings) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.textSize = settings.textSize;
  root.dataset.reduceMotion = settings.reduceMotion ? "true" : "false";
  root.dataset.theme = settings.theme;
  // Keep <meta name="theme-color"> + the root canvas in sync so the browser
  // chrome (mobile address bar, overscroll) matches the active theme.
  root.style.colorScheme = settings.theme;
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
