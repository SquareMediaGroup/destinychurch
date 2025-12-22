"use client";

import { ToastProvider } from "./ToastProvider";
import { CookieConsentProvider } from "@/lib/cookieConsent";
import { SettingsProvider } from "@/lib/settings";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      <CookieConsentProvider>
        <ToastProvider>{children}</ToastProvider>
      </CookieConsentProvider>
    </SettingsProvider>
  );
}
