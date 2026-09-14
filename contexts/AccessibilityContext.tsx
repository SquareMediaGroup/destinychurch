"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import {
  getPrefsSnapshot,
  getServerPrefsSnapshot,
  setPrefs,
  subscribePrefs,
} from "@/lib/accessibilityPrefs";

interface AccessibilityContextType {
  glassFX: boolean;
  setGlassFX: (value: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

// Module-level, so the context value is referentially stable across renders and
// consumers that only need the setters never re-render because of a pref change.
const setGlassFX = (value: boolean) => setPrefs({ glassFX: value });
const setReducedMotion = (value: boolean) => setPrefs({ reducedMotion: value });

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const { glassFX, reducedMotion } = useSyncExternalStore(
    subscribePrefs,
    getPrefsSnapshot,
    getServerPrefsSnapshot,
  );

  // Mirror the prefs onto <html> for the CSS to key off. The inline script in
  // app/layout.tsx has already done this for the first paint; this keeps it in
  // step with later changes, and is a genuine external-system sync.
  useEffect(() => {
    const root = document.documentElement;
    if (glassFX) delete root.dataset.glassfx;
    else root.dataset.glassfx = "off";

    if (reducedMotion) root.dataset.motion = "reduced";
    else delete root.dataset.motion;
  }, [glassFX, reducedMotion]);

  return (
    <AccessibilityContext.Provider
      value={{ glassFX, setGlassFX, reducedMotion, setReducedMotion }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
