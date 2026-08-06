"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCookieConsent } from "@/lib/cookieConsent";

export default function CookieBanner() {
  const { consent, allowAll, denyOptional } = useCookieConsent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Hydration guard so SSR and client markup stay aligned before consent loads from storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted || consent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:max-w-xl">
      <div className="glass glass-strong glass-refract rounded-2xl p-4 text-sm text-white/75">
        <p className="font-semibold text-white/90">We use cookies</p>
        <p className="mt-2 text-[13px] leading-relaxed">
          We use essential cookies to keep this site running, and optional cookies for embedded forms,
          YouTube videos and anonymous analytics that help us improve your experience.
          You can read more in our{" "}
          <Link href="/privacy" className="text-white/90 underline underline-offset-2 hover:text-destiny-orange">Privacy Policy</Link>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={allowAll}
            className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:brightness-110"
          >
            Accept all cookies
          </button>
          <button
            onClick={denyOptional}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/80 transition hover:border-destiny-orange hover:bg-destiny-orange/15 hover:text-white"
          >
            Necessary cookies only
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-white/45">
          By accepting, you agree to our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-destiny-orange">Privacy Policy</Link>{" "}
          and{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-destiny-orange">Terms of Use</Link>.
        </p>
      </div>
    </div>
  );
}
