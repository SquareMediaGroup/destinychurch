"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCookieConsent } from "@/lib/cookieConsent";
import { useHydrated } from "@/lib/useHydrated";

export default function CookieBanner() {
  const { consent, allowAll, denyOptional } = useCookieConsent();
  // Hydration guard so SSR and client markup stay aligned before consent loads from storage.
  const mounted = useHydrated();
  const pathname = usePathname();
  const bannerRef = useRef<HTMLDivElement>(null);

  // /portal is the staff self-service area: its own minimal shell, no site chrome.
  // /talent-show/screen runs full screen on a projector with nobody to dismiss it.
  const visible =
    mounted && !consent && !pathname.startsWith("/portal") && pathname !== "/talent-show/screen";

  // Publish how much of the viewport bottom the banner covers so the toast
  // stack (ToastProvider) sits above it instead of on top of it — the
  // Performance Mode toast fires on first visit, exactly when this shows.
  useEffect(() => {
    const root = document.documentElement;
    const el = bannerRef.current;
    if (!visible || !el) {
      root.style.removeProperty("--cookie-banner-clearance");
      return;
    }
    const apply = () =>
      root.style.setProperty(
        "--cookie-banner-clearance",
        `${window.innerHeight - el.getBoundingClientRect().top + 12}px`
      );
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      root.style.removeProperty("--cookie-banner-clearance");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div ref={bannerRef} className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:max-w-xl">
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
        <p className="mt-3 text-[11px] leading-relaxed text-on-dark-subtle">
          By accepting, you agree to our{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-destiny-orange">Privacy Policy</Link>{" "}
          and{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-destiny-orange">Terms of Use</Link>.
        </p>
      </div>
    </div>
  );
}
