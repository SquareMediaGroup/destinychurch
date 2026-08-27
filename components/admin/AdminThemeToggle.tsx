"use client";

// The dark-mode control. A 3-way cycle rather than a binary switch, because
// "system" is the sane default (matches the OS, no jarring first-run flash for
// anyone already on a dark OS) and needs its own explicit state rather than
// being folded into "off".
//
// One icon button that cycles light → dark → system → light, matching the
// existing icon-button visual language in AdminHeader.tsx (the keyboard-
// shortcuts button) rather than introducing a new control style.

import { useAdminTheme, type AdminTheme } from "@/lib/adminTheme";

const NEXT: Record<AdminTheme, AdminTheme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const ICON: Record<AdminTheme, string> = {
  light: "light_mode",
  dark: "dark_mode",
  system: "contrast",
};

const LABEL: Record<AdminTheme, string> = {
  light: "Light",
  dark: "Dark",
  system: "Match system",
};

export function AdminThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useAdminTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`Theme: ${LABEL[theme]}. Click to change.`}
      title={`Theme: ${LABEL[theme]} — click to change`}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white text-destiny-grey/45 transition hover:text-destiny-grey dark:border-white/10 dark:bg-destiny-grey-800 dark:text-white/45 dark:hover:text-white ${className}`}
    >
      <span className="material-symbols-rounded text-lg">{ICON[theme]}</span>
    </button>
  );
}
