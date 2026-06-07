"use client";

import { useSettings } from "@/lib/settings";

/**
 * Dark/light theme switch wired into the global settings store.
 *
 * Two presentations share one piece of state:
 *  - "icon"  — a compact, glowing sun↔moon button for the header pill (light
 *              text on the dark translucent pill).
 *  - "row"   — a full-width labelled row with a sliding track, for the mobile
 *              menu and any settings surface.
 *
 * The sun and moon glyphs are stacked and cross-faded with a rotate/scale so the
 * change of state reads as one celestial body rising as the other sets.
 */
export default function ThemeToggle({
  variant = "icon",
}: {
  variant?: "icon" | "row";
}) {
  const { settings, updateSetting } = useSettings();
  const isDark = settings.theme === "dark";
  const toggle = () => updateSetting("theme", isDark ? "light" : "dark");

  const SunMoon = (
    <span className="relative inline-flex h-5 w-5 items-center justify-center">
      {/* Sun */}
      <span
        className="material-symbols-rounded absolute text-[20px] transition-all duration-500"
        style={{
          opacity: isDark ? 0 : 1,
          transform: isDark ? "rotate(-90deg) scale(0.4)" : "rotate(0) scale(1)",
        }}
        aria-hidden="true"
      >
        light_mode
      </span>
      {/* Moon */}
      <span
        className="material-symbols-rounded absolute text-[20px] transition-all duration-500"
        style={{
          opacity: isDark ? 1 : 0,
          transform: isDark ? "rotate(0) scale(1)" : "rotate(90deg) scale(0.4)",
        }}
        aria-hidden="true"
      >
        dark_mode
      </span>
    </span>
  );

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={toggle}
        role="switch"
        aria-checked={isDark}
        aria-label="Toggle dark mode"
        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-destiny-grey transition hover:bg-gray-50 dark:text-white/90 dark:hover:bg-white/5"
      >
        <span className="flex items-center gap-3">
          <span className="text-destiny-orange">{SunMoon}</span>
          {isDark ? "Dark mode" : "Light mode"}
        </span>
        {/* Track */}
        <span
          className="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #f58021, #d96d10)"
              : "rgba(54, 63, 72, 0.18)",
          }}
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300"
            style={{ left: isDark ? "calc(100% - 1.375rem)" : "0.125rem" }}
          />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="group relative flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-destiny-orange"
    >
      {/* Warm glow that blooms when dark is active */}
      <span
        className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500"
        style={{
          opacity: isDark ? 1 : 0,
          boxShadow: "0 0 14px 1px rgba(245, 128, 33, 0.45)",
        }}
        aria-hidden="true"
      />
      <span className={isDark ? "text-destiny-orange" : ""}>{SunMoon}</span>
    </button>
  );
}
