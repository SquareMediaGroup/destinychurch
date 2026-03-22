"use client";

import { ToastProvider } from "./ToastProvider";
import { CookieConsentProvider } from "@/lib/cookieConsent";
import { SettingsProvider } from "@/lib/settings";
import { BannerContext } from "@/contexts/BannerContext";

interface BannerData {
  active: boolean;
  message: string;
  link?: string | null;
  link_text?: string | null;
}

interface ProvidersProps {
  children: React.ReactNode;
  banner?: BannerData | null;
}

export default function Providers({ children, banner }: ProvidersProps) {
  return (
    <BannerContext.Provider value={banner ?? { active: false, message: "" }}>
      <SettingsProvider>
        <CookieConsentProvider>
          <ToastProvider>{children}</ToastProvider>
        </CookieConsentProvider>
      </SettingsProvider>
    </BannerContext.Provider>
  );
}
