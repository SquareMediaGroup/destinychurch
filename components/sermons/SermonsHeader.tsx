"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { useBanner } from "@/contexts/BannerContext";

const tabs = [
  { label: "Sermons", href: "/sermons" },
  { label: "Guest Speakers", href: "/sermons/guest-speakers" },
];

export default function SermonsHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastScrollY = useRef(0);
  const banner = useBanner();
  const bannerOffset = banner.active ? "top-10" : "top-0";

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    setScrolled(y > 50);
    if (y > lastScrollY.current && y > 80) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    lastScrollY.current = y;
  }, []);

  useEffect(() => {
    setMounted(true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 80) setHidden(false);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 z-50 ${bannerOffset}`}
      style={{
        transform: !mounted || hidden ? "translateY(-110%)" : "translateY(0)",
        transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
        <div
          className={`flex items-center justify-between rounded-full border px-6 py-3 backdrop-blur-md transition-all duration-300 ${
            scrolled
              ? "border-white/10 bg-destiny-grey/60 shadow-xl shadow-black/30"
              : "border-white/10 bg-destiny-grey/40 shadow-lg shadow-black/10"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center">
            <div className="relative h-9 w-[170px]">
              <Image
                src="/img/brand/destiny-logo-color-white.svg"
                alt="Destiny Church"
                fill
                priority
                sizes="170px"
                className="object-contain"
              />
            </div>
          </Link>

          {/* Sub-nav pill — centred on desktop */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-sm">
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ${
                      active
                        ? "bg-white text-[#0d0d0d] shadow-sm"
                        : "text-white/70 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right — CTA + mobile toggle */}
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/new-here"
              className="hidden whitespace-nowrap rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 md:block"
            >
              New Here?
            </Link>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
              className="relative h-10 w-10 rounded-full text-white transition md:hidden"
            >
              <span className={`absolute inset-0 flex flex-col items-center justify-center gap-[5px] transition-opacity duration-200 ${mobileOpen ? "opacity-0" : "opacity-100"}`}>
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
              <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${mobileOpen ? "opacity-100" : "opacity-0"}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="mt-2 rounded-2xl border border-white/10 bg-destiny-grey/90 p-3 shadow-xl backdrop-blur-md md:hidden">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
            <div className="mt-2 border-t border-white/10 pt-2">
              <Link
                href="/new-here"
                onClick={() => setMobileOpen(false)}
                className="block rounded-xl bg-destiny-orange px-4 py-3 text-center text-sm font-bold text-white"
              >
                New Here?
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
