"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ToastProvider";
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

export function useContinueWatching() {
  const [items, setItems] = useState<ContinueWatchingEntry[]>([]);
  const [mounted, setMounted] = useState(false);
  const toast = useToast();

  const writeProgress = useCallback(
    (entries: ContinueWatchingEntry[]) => {
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        toast.error("Unable to save your progress. Please check storage access.");
        throw error;
      }
    },
    [toast],
  );

  useEffect(() => {
    try {
      setItems(readProgress());
    } catch {
      toast.error("Unable to load saved progress.");
    } finally {
      setMounted(true);
    }
  }, [toast]);

  const saveProgress = useCallback(
    (sermonId: string, lastPosition: number, durationSeconds?: number) => {
      try {
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
      } catch {
        toast.error("Unable to save your spot. Please try again.");
      }
    },
    [toast, writeProgress],
  );

  const clearProgress = useCallback(
    (sermonId: string) => {
      try {
        const next = readProgress().filter((item) => item.sermonId !== sermonId);
        writeProgress(next);
        setItems(next);
      } catch {
        toast.error("Unable to update saved progress.");
      }
    },
    [toast, writeProgress],
  );

  const refresh = useCallback(() => {
    try {
      setItems(readProgress());
    } catch {
      toast.error("Unable to refresh saved progress.");
    }
  }, [toast]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.lastUpdated - a.lastUpdated),
    [items],
  );

  return {
    mounted,
    items: sorted,
    saveProgress,
    clearProgress,
    refresh,
  };
}
