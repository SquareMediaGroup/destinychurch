"use client";

import { useCallback, useState, useMemo, createContext, useContext, useEffect } from "react";

export type CookieConsentState = {
  essential: true;
  media: boolean;
  analytics: boolean;
  updatedAt: number;
};

const STORAGE_KEY = "destiny-cookie-consent";

const safeParse = (raw: string | null): CookieConsentState | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      parsed.essential === true &&
      typeof parsed.media === "boolean" &&
      typeof parsed.analytics === "boolean" &&
      typeof parsed.updatedAt === "number"
    ) {
      return parsed as CookieConsentState;
    }
  } catch {
    return null;
  }
  return null;
};

// Storage access throws (SecurityError) when the browser blocks site data —
// Safari's "Block all cookies", some embedded webviews. This provider wraps
// every page, so an unguarded throw here took the whole site down; without
// storage the banner simply asks again next visit.
const readConsent = (): CookieConsentState | null => {
  if (typeof window === "undefined") return null;
  try {
    return safeParse(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

const writeConsent = (value: CookieConsentState) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Not persisted — the choice still applies for this page view.
  }
};

type CookieConsentContextValue = {
  consent: CookieConsentState | null;
  decided: boolean;
  allowAll: () => void;
  denyOptional: () => void;
  savePreferences: (opts: Pick<CookieConsentState, "media" | "analytics">) => void;
};

const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [consent, setConsent] = useState<CookieConsentState | null>(null);
  const decided = useMemo(() => consent !== null, [consent]);

  useEffect(() => {
    const stored = readConsent();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConsent(stored);
    }
  }, []);

  const update = useCallback((next: CookieConsentState) => {
    setConsent(next);
    writeConsent(next);
  }, []);

  const allowAll = useCallback(() => {
    update({
      essential: true,
      media: true,
      analytics: true,
      updatedAt: Date.now(),
    });
  }, [update]);

  const denyOptional = useCallback(() => {
    update({
      essential: true,
      media: false,
      analytics: false,
      updatedAt: Date.now(),
    });
  }, [update]);

  const savePreferences = useCallback(
    (opts: Pick<CookieConsentState, "media" | "analytics">) => {
      update({
        essential: true,
        media: opts.media,
        analytics: opts.analytics,
        updatedAt: Date.now(),
      });
    },
    [update],
  );

  return (
    <CookieConsentContext.Provider value={{ consent, decided, allowAll, denyOptional, savePreferences }}>
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const ctx = useContext(CookieConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used within CookieConsentProvider");
  }
  return ctx;
}
