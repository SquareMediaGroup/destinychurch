"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { useSettings } from "@/lib/settings";

type Theme = "light" | "dark";

export default function ThemeToggle() {
  const { settings, updateSetting } = useSettings();
  const [systemTheme, setSystemTheme] = useState<Theme>("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemTheme(media.matches ? "dark" : "light");
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const resolvedTheme = settings.theme === "system" ? systemTheme : settings.theme;
  const toggleTheme = () =>
    updateSetting("theme", resolvedTheme === "dark" ? "light" : "dark");

  const label = resolvedTheme === "dark" ? "Light mode" : "Dark mode";
  const icon = resolvedTheme === "dark" ? "light_mode" : "dark_mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange"
      aria-label={`Toggle ${label.toLowerCase()}`}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}
