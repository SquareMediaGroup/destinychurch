"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface AccessibilityContextType {
  glassFX: boolean;
  setGlassFX: (value: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [glassFX, setGlassFXState] = useState(true);
  const [reducedMotion, setReducedMotionState] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem("destiny-a11y");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (typeof parsed.glassFX === "boolean") {
          setGlassFXState(parsed.glassFX);
        }
        if (typeof parsed.reducedMotion === "boolean") {
          setReducedMotionState(parsed.reducedMotion);
        }
      } else {
        // optionally check prefers-reduced-motion
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (prefersReducedMotion) {
          setReducedMotionState(true);
          document.documentElement.dataset.motion = "reduced";
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Apply dataset values to HTML element
    const root = document.documentElement;
    if (glassFX) {
      delete root.dataset.glassfx;
    } else {
      root.dataset.glassfx = "off";
    }

    if (reducedMotion) {
      root.dataset.motion = "reduced";
    } else {
      delete root.dataset.motion;
    }

    // Save to local storage
    try {
      localStorage.setItem("destiny-a11y", JSON.stringify({ glassFX, reducedMotion }));
    } catch (e) {
      // ignore
    }
  }, [glassFX, reducedMotion, mounted]);

  const setGlassFX = (val: boolean) => {
    setGlassFXState(val);
  };

  const setReducedMotion = (val: boolean) => {
    setReducedMotionState(val);
  };

  return (
    <AccessibilityContext.Provider value={{ glassFX, setGlassFX, reducedMotion, setReducedMotion }}>
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
