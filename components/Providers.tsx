"use client";

import { ToastProvider } from "./ToastProvider";
import { CookieConsentProvider } from "@/lib/cookieConsent";
import { SettingsProvider } from "@/lib/settings";
import { BannerContext, type BannerData } from "@/contexts/BannerContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { LiveProvider, type LiveState } from "@/contexts/LiveContext";

interface ProvidersProps {
  children: React.ReactNode;
  banner?: BannerData | null;
  live?: LiveState;
}

export default function Providers({ children, banner, live }: ProvidersProps) {
  return (
    <BannerContext.Provider value={banner ?? { active: false, message: "", type: "announcement" }}>
      <LiveProvider initial={live ?? { live: false, videoId: null }}>
        <SettingsProvider>
          <AccessibilityProvider>
            <CookieConsentProvider>
              <ToastProvider>{children}</ToastProvider>
            </CookieConsentProvider>
          </AccessibilityProvider>
        </SettingsProvider>
      </LiveProvider>
    </BannerContext.Provider>
  );
}
