"use client";

import { ToastProvider } from "./ToastProvider";
import { CookieConsentProvider } from "@/lib/cookieConsent";
import { SettingsProvider } from "@/lib/settings";
import { BannerContext, type BannerData } from "@/contexts/BannerContext";

interface ProvidersProps {
  children: React.ReactNode;
  banner?: BannerData | null;
}

export default function Providers({ children, banner }: ProvidersProps) {
  return (
    <BannerContext.Provider value={banner ?? { active: false, message: "", type: "announcement" }}>
      <SettingsProvider>
        <CookieConsentProvider>
          <ToastProvider>{children}</ToastProvider>
        </CookieConsentProvider>
      </SettingsProvider>
    </BannerContext.Provider>
  );
}
