"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type TextSize = "normal" | "large";

export type Settings = {
  textSize: TextSize;
  reduceMotion: boolean;
};

export const SETTINGS_STORAGE_KEY = "destiny-settings";

const DEFAULT_SETTINGS: Settings = {
  textSize: "normal",
  reduceMotion: false,
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
