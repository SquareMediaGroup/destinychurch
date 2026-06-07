"use client";
import { useEffect } from "react";
import { useSettings } from "@/lib/settings";

export default function HomeOverscrollColor() {
  const { settings } = useSettings();
  useEffect(() => {
    // Orange overscroll is a light-mode brand flourish. In dark mode it would
    // glare through every section's transparent padding, so we match the dark
    // canvas instead and let the atmosphere layer carry the warmth subtly.
    document.documentElement.style.background =
      settings.theme === "dark" ? "#101316" : "#F58021";
    return () => {
      document.documentElement.style.background = "";
    };
  }, [settings.theme]);
  return null;
}
