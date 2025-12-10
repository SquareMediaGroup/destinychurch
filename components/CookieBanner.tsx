"use client";

import Link from "next/link";
import { useCookieConsent } from "@/lib/cookieConsent";

export default function CookieBanner() {
  const { consent, allowAll, denyOptional } = useCookieConsent();

  if (consent) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:max-w-xl">
      <div className="rounded-2xl border border-black/10 bg-white/95 p-4 text-sm text-destiny-grey shadow-xl backdrop-blur dark:border-white/10 dark:bg-[var(--surface)]/95">
        <p className="font-semibold text-destiny-black">Cookies for video, analytics, and protection</p>
        <p className="mt-2 text-[13px] leading-relaxed">
          We use cookies for YouTube playback, Cloudflare protection, Google Analytics, and saved progress
          (Continue Watching). If you decline optional cookies, videos will stay blocked.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={allowAll}
            className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:brightness-95"
          >
            Allow all
          </button>
          <button
            onClick={denyOptional}
            className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--foreground)] transition hover:border-destiny-orange"
          >
            Decline optional
          </button>
          <Link
            href="/cookies"
            className="rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-wide text-destiny-orange transition hover:underline"
          >
            Manage preferences
          </Link>
        </div>
      </div>
    </div>
  );
}
