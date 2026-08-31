"use client";

// Lets a page (e.g. the 404 page, which embeds its own Smart Search box) hide
// the globally-rendered floating pill for as long as it's mounted, so
// visitors never see two Smart Search entry points on screen at once.

import { createContext, useCallback, useContext, useMemo, useState } from "react";

const SmartSearchVisibilityContext = createContext<{
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
} | null>(null);

export function SmartSearchVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const value = useMemo(() => ({ hidden, setHidden }), [hidden]);
  return (
    <SmartSearchVisibilityContext.Provider value={value}>
      {children}
    </SmartSearchVisibilityContext.Provider>
  );
}

/** Read whether the floating pill should currently render itself. */
export function useFloatingSmartSearchHidden(): boolean {
  const ctx = useContext(SmartSearchVisibilityContext);
  return ctx?.hidden ?? false;
}

/** Hide the floating pill for the lifetime of the calling component. */
export function useHideFloatingSmartSearch() {
  const ctx = useContext(SmartSearchVisibilityContext);
  const setHidden = ctx?.setHidden;
  return useCallback(() => {
    setHidden?.(true);
    return () => setHidden?.(false);
  }, [setHidden]);
}
