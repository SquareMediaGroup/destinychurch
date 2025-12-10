"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "destiny-theme";

function resolvePreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const preferred = resolvePreferredTheme();
    setTheme(preferred);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((current) => (current === "dark" ? "light" : "dark"));

  const label = theme === "dark" ? "Light mode" : "Dark mode";
  const icon = theme === "dark" ? "light_mode" : "dark_mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)] shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
      aria-label={`Toggle ${label.toLowerCase()}`}
    >
      <span className="material-symbols-rounded text-[20px]" aria-hidden>
        {icon}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
