"use client";

import { useEffect, useState } from "react";

// Trainees reach this content via a shared per-group password, not individual
// logins, so there is no server-side identity to attach progress to. We track
// completion per-browser in localStorage. Post ids are UUIDs, so a single flat
// set works across every category and sub-group.
const KEY = "dc_training_completed";
const EVENT = "dc-training-progress";

function read(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function toggleCompleted(postId: string, value: boolean) {
  const set = read();
  if (value) set.add(postId);
  else set.delete(postId);
  try {
    window.localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* storage unavailable (private mode) — silently no-op */
  }
  // Notify same-tab listeners (the 'storage' event only fires cross-tab).
  window.dispatchEvent(new Event(EVENT));
}

// Reactive view of the completed set. Starts empty so server and first client
// render match (no hydration mismatch), then fills in after mount.
export function useCompletedSet(): Set<string> {
  const [set, setSet] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const refresh = () => setSet(read());
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return set;
}
