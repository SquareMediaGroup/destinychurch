"use client";

// Dark mode for /admin — a per-browser preference, not a per-account one.
//
// Same shape as the "remembered dropdown state" store in AdminSidebar.tsx:
// useSyncExternalStore with a stable cached snapshot (so the server and first
// client render agree — no hydration mismatch) and a same-window custom event
// so every component reading the theme updates together, not just the one that
// wrote it. Follows the existing "dc-admin-*" localStorage naming convention
// (dc-admin-open-groups, dc-admin-recents).
//
// Deliberately localStorage, not a DB column: there is no per-user settings
// table in the schema (admin_roles is roles-only), and light/dark is exactly
// the kind of thing every other admin preference already lives in the browser
// for (see lib/adminRecents.ts, the sidebar's open-groups store). If synced
// preferences are wanted later, that's a new concern layered on top of this
// hook's public surface, not a reason to build it now.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type AdminTheme = "light" | "dark" | "system";

const THEME_KEY = "dc-admin-theme";
const THEME_EVENT = "dc-admin-theme-change";

const DEFAULT_THEME: AdminTheme = "system";

let cache: AdminTheme | null = null;

function isTheme(value: unknown): value is AdminTheme {
  return value === "light" || value === "dark" || value === "system";
}

function readTheme(): AdminTheme {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(THEME_KEY);
    cache = isTheme(raw) ? raw : DEFAULT_THEME;
  } catch {
    cache = DEFAULT_THEME;
  }
  return cache;
}

function readThemeServer(): AdminTheme {
  return DEFAULT_THEME;
}

function subscribeToTheme(onChange: () => void): () => void {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function writeTheme(next: AdminTheme) {
  cache = next;
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Private browsing — the choice just won't survive a reload.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

function systemPrefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
  );
}

export interface AdminThemeState {
  /** What's stored: the explicit choice, or "system". */
  theme: AdminTheme;
  /** What's actually shown right now — "system" resolved against the OS. */
  resolvedTheme: "light" | "dark";
  /** `"dark"` or `""` — spread straight into a className string. */
  themeClass: "dark" | "";
  setTheme: (theme: AdminTheme) => void;
}

/**
 * Reads and writes the admin's theme choice.
 *
 * Deliberately returns a class name for the caller to render rather than
 * reaching for the DOM itself (e.g. toggling a class on
 * `document.documentElement`): that element belongs to the whole page, is
 * shared with every public route, and an imperative mutation here would have
 * no natural cleanup on client-side navigation away from /admin — the class
 * would simply be left behind on `<html>` after AdminLayout unmounts. Instead
 * app/admin/layout.tsx puts `themeClass` directly on its own wrapper div, so
 * React's normal render lifecycle is the only thing that ever adds or removes
 * it — leaving nothing behind when a visitor navigates back to the public site.
 */
export function useAdminTheme(): AdminThemeState {
  const theme = useSyncExternalStore(subscribeToTheme, readTheme, readThemeServer);

  // Tracked as state (not read inline) because "system" has to react to a
  // live OS-level scheme change while the tab stays open, which a plain
  // function call during render can't do on its own.
  const [systemDark, setSystemDark] = useState(false);

  useEffect(() => {
    setSystemDark(systemPrefersDark());
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  const setTheme = useCallback((next: AdminTheme) => writeTheme(next), []);

  return {
    theme,
    resolvedTheme,
    themeClass: resolvedTheme === "dark" ? "dark" : "",
    setTheme,
  };
}
