"use client";

// The last few admin pages you opened, kept in localStorage.
//
// Real admin work is repetitive: the same three or four sections, over and
// over, with a week between visits. "Jump back in" on the dashboard and the
// default list in an empty ⌘K palette both come from here, so the second visit
// is one keystroke instead of a hunt through the sidebar.
//
// Only paths are stored — never record contents — so there is nothing
// sensitive sitting in the browser after someone signs out on a shared machine.

import { useCallback, useEffect, useState } from "react";

const KEY = "dc-admin-recents";
const LIMIT = 6;

/** Pages that are never worth offering as a shortcut back. */
const IGNORED = [/^\/admin$/, /^\/admin\/forgot-password/, /^\/admin\/reset-password/];

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((p) => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function write(paths: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(paths));
  } catch {
    // Private browsing / quota — recents are a convenience, never a dependency.
  }
}

export function recordAdminVisit(pathname: string) {
  if (typeof window === "undefined") return;
  if (IGNORED.some((p) => p.test(pathname))) return;
  const next = [pathname, ...read().filter((p) => p !== pathname)].slice(0, LIMIT);
  write(next);
  // Same-tab listeners: the `storage` event only fires in *other* tabs.
  window.dispatchEvent(new CustomEvent("dc-admin-recents"));
}

export function useAdminRecents(): { recents: string[]; clear: () => void } {
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setRecents(read());
    sync();
    window.addEventListener("dc-admin-recents", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("dc-admin-recents", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const clear = useCallback(() => {
    write([]);
    setRecents([]);
  }, []);

  return { recents, clear };
}
