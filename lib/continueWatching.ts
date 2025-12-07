"use client";

import { useCallback, useMemo, useState } from "react";
import { ContinueWatchingEntry } from "./types";

const STORAGE_KEY = "destiny-sermons-progress";

const safeParse = (raw: string | null): ContinueWatchingEntry[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) =>
          item &&
          typeof item.sermonId === "string" &&
          typeof item.lastPosition === "number" &&
          typeof item.lastUpdated === "number",
      );
    }
    return [];
  } catch {
    return [];
  }
};

const readProgress = (): ContinueWatchingEntry[] => {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
};

const writeProgress = (entries: ContinueWatchingEntry[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
};

export function useContinueWatching() {
  const [items, setItems] = useState<ContinueWatchingEntry[]>(() => readProgress());

  const saveProgress = useCallback(
    (sermonId: string, lastPosition: number, durationSeconds?: number) => {
      const existing = readProgress().filter((item) => item.sermonId !== sermonId);
      if (durationSeconds && durationSeconds - lastPosition <= 30) {
        const next = existing;
        writeProgress(next);
        setItems(next);
        return;
      }

      const entry: ContinueWatchingEntry = {
        sermonId,
        lastPosition,
        lastUpdated: Date.now(),
        durationSeconds,
      };

      const next = [...existing, entry];
      writeProgress(next);
      setItems(next);
    },
    [],
  );

  const clearProgress = useCallback((sermonId: string) => {
    const next = readProgress().filter((item) => item.sermonId !== sermonId);
    writeProgress(next);
    setItems(next);
  }, []);

  const refresh = useCallback(() => {
    setItems(readProgress());
  }, []);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.lastUpdated - a.lastUpdated),
    [items],
  );

  return {
    items: sorted,
    saveProgress,
    clearProgress,
    refresh,
  };
}
