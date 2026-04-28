"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useBanner } from "@/contexts/BannerContext";
import GlobalSearch from "./GlobalSearch";

const aboutDropdown = [
  { href: "/about", label: "Our Mission" },
  { href: "/about#pillars", label: "Foundational Pillars" },
  { href: "/about#team", label: "Meet the Team" },
  { href: "/beliefs", label: "What We Believe" },
  { href: "/visit", label: "Plan a Visit" },
];

const whatsOnDropdownBase = [
  { href: "/whats-on#events", label: "Events" },
  { href: "/whats-on#courses", label: "Courses" },
  { href: "/missions", label: "Missions" },
  { href: "/whats-on#highlights", label: "Highlights" },
];

const mobileNavItemsBase = [
  { href: "/whats-on",   label: "What's On"  },
  { href: "/sermons",    label: "Sermons"    },
  { href: "/serve",      label: "Serve"      },
  { href: "/about",      label: "About"      },
  { href: "/give",       label: "Give"       },
];

function Dropdown({
  items,
  open,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  items: { href: string; label: string }[];
  open: boolean;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2"
      style={{
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: open ? "opacity 0.15s ease" : "opacity 1.2s ease",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="min-w-[180px] rounded-2xl border border-black/5 bg-white p-2 shadow-xl">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onClose}
            className="block rounded-xl px-4 py-2.5 text-sm font-medium text-destiny-grey transition hover:bg-gray-50 hover:text-destiny-orange"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

const MORPH_DISTANCE = 180;

export default function ChurchHeader() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [alphaActive, setAlphaActive] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const bridgeInputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId = useRef<number | null>(null);

  const handleNavMouseEnter = (label: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setOpenDropdown(label);
  };

  const handleNavMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setOpenDropdown(null), 50);
  };

  const handleScroll = useCallback(() => {
    if (rafId.current != null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const y = window.scrollY;
      setMobileOpen(false);
      setScrolled(y > 50);
      setProgress(Math.min(1, Math.max(0, y / MORPH_DISTANCE)));
      if (y > MORPH_DISTANCE && y > lastScrollY.current) {
        setHidden(true);
        setOpenDropdown(null);
        setSearchOpen(false);
      } else {
        setHidden(false);
      }
      lastScrollY.current = y;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [handleScroll]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 80) setHidden(false);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/alpha-events")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return;
        const hasActive = Array.isArray(data)
          && data.some((e: { type?: string; active?: boolean }) => e.type === "alpha" && e.active);
        setAlphaActive(hasActive);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const whatsOnDropdown = useMemo(
    () =>
      alphaActive
        ? [
            whatsOnDropdownBase[0],
            whatsOnDropdownBase[1],
            { href: "/alpha", label: "Alpha" },
            ...whatsOnDropdownBase.slice(2),
          ]
        : whatsOnDropdownBase,
    [alphaActive]
  );

  const navItems = useMemo(
    () => [
      { label: "What's on", href: "/whats-on", dropdown: whatsOnDropdown },
      { href: "/sermons", label: "Sermons" },
      ...(alphaActive ? [{ href: "/alpha", label: "Alpha" }] : []),
      { href: "/serve", label: "Serve" },
      { label: "About", href: "/about", dropdown: aboutDropdown },
      { href: "/give", label: "Give" },
    ],
    [alphaActive, whatsOnDropdown]
  );

  const mobileNavItems = useMemo(
    () =>
      alphaActive
        ? [
            mobileNavItemsBase[0],
            mobileNavItemsBase[1],
            { href: "/alpha", label: "Alpha" },
            ...mobileNavItemsBase.slice(2),
          ]
        : mobileNavItemsBase,
    [alphaActive]
  );

  if (pathname.startsWith("/admin")) return null;

  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";
  const banner = useBanner();
  const bannerOffset = banner.active && !isAdmin ? "top-10" : "top-0";

  return (
    <>
      {/* iOS keyboard bridge — always in DOM so focus() can be called synchronously in click handlers */}
      <input
        ref={bridgeInputRef}
        type="text"
        aria-hidden="true"
        tabIndex={-1}
        readOnly
        style={{ position: "fixed", opacity: 0, width: 0, height: 0, top: 0, left: 0, pointerEvents: "none" }}
      />

      {/* Backdrop behind search panel */}
      {searchOpen && !isAdmin && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={() => setSearchOpen(false)}
          aria-hidden="true"
        />
      )}

      <header
        ref={headerRef}
        className={`${isHome ? "fixed left-0 right-0" : "sticky"} z-50 ${bannerOffset}`}
        style={{
          transform: !mounted || hidden ? "translateY(-110%)" : "translateY(0)",
          transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "visible",
        }}
      >
        {/* Sermons / Guest Speakers toggle — floats below header, zero height impact */}
        {pathname.startsWith("/sermons") && !isAdmin && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              paddingTop: "8px",
              zIndex: 10,
            }}
          >
            <div className="flex items-center rounded-full border border-white/15 bg-white/10 p-1 shadow-lg backdrop-blur-sm">
              {[
                { label: "Sermons", href: "/sermons" },
                { label: "Guest Speakers", href: "/sermons/guest-speakers" },
              ].map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold transition-all duration-200 ${
                      active ? "bg-white text-[#0d0d0d] shadow-sm" : "text-white/70 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
        <div
          className="mx-auto"
          style={{
            maxWidth: `min(100%, calc(100% + (80rem - 100%) * ${progress}))`,
            paddingTop: `${progress}rem`,
            paddingBottom: `${progress}rem`,
            paddingLeft: `${progress}rem`,
            paddingRight: `${progress}rem`,
          }}
        >
          {/* Pill */}
          <div
            className={`flex items-center justify-between border border-white/10 px-4 py-2 backdrop-blur-md md:px-6 ${
              scrolled ? "shadow-xl shadow-black/30" : "shadow-lg shadow-black/10"
            }`}
            style={{
              borderRadius: `${48 * progress}px`,
              backgroundColor: `rgba(54, 63, 72, ${(isHome ? 0.6 : 1) - (isHome ? 0.2 : 0.6) * progress})`,
              transition: "box-shadow 0.3s, border-color 0.3s",
            }}
          >
            {/* Logo — responsive size */}
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-8 w-[152px] md:h-[43px] md:w-[204px]">
                <Image
                  src="/img/brand/destiny-logo-color-white.svg"
                  alt="Destiny Church"
                  fill
                  priority
                  sizes="(min-width: 768px) 204px, 152px"
                  className="object-contain"
                />
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {!isAdmin &&
                navItems.map((item) => {
                  if (item.dropdown) {
                    const isOpen = openDropdown === item.label;
                    return (
                      <div
                        key={item.label}
                        className="relative flex items-center"
                        onMouseEnter={() => handleNavMouseEnter(item.label)}
                        onMouseLeave={handleNavMouseLeave}
                      >
                        <Link
                          href={item.href!}
                          className="rounded-full px-4 py-2 text-sm font-medium text-white/90 transition hover:text-destiny-orange"
                        >
                          {item.label}
                        </Link>
                        <Dropdown
                          items={item.dropdown}
                          open={isOpen}
                          onClose={() => setOpenDropdown(null)}
                          onMouseEnter={() => handleNavMouseEnter(item.label)}
                          onMouseLeave={handleNavMouseLeave}
                        />
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href!}
                      className="rounded-full px-4 py-2 text-sm font-medium text-white/90 transition hover:text-destiny-orange"
                    >
                      {item.label}
                    </Link>
                  );
                })}

              {isAdmin && (
                <>
                  <span className="mx-1 h-4 w-px bg-white/20" />
                  <span className="rounded-full bg-destiny-orange/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                    Admin
                  </span>
                  {[
                    { href: "/admin/redirects", label: "Redirects" },
                    { href: "/admin/sermons", label: "Sermons" },
                    { href: "/admin/banner", label: "Banner" },
                    { href: "/admin/pages", label: "Pages" },
                  ].map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        pathname.startsWith(item.href)
                          ? "text-destiny-orange"
                          : "text-white/90 hover:text-destiny-orange"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                  <form action="/api/admin/logout" method="POST">
                    <button
                      type="submit"
                      className="rounded-full px-4 py-2 text-sm font-medium text-white/50 transition hover:text-white/90"
                    >
                      Sign out
                    </button>
                  </form>
                </>
              )}
            </nav>

            {/* Right: search icon + CTA + mobile toggle */}
            <div className="flex items-center gap-2">
              {/* Smart Search icon — all screen sizes, non-admin */}
              {!isAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!searchOpen) {
                      bridgeInputRef.current?.focus(); // synchronous — iOS keyboard appears
                    }
                    setSearchOpen((v) => !v);
                    setMobileOpen(false);
                  }}
                  className={`relative flex items-center justify-center rounded-full p-2 ${
                    searchOpen
                      ? "bg-white/10 text-destiny-orange"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-label={searchOpen ? "Close Smart Search" : "Open Smart Search"}
                >
                  {searchOpen ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      </svg>
                      {/* AI sparkle badge */}
                      <svg
                        className="absolute right-0.5 top-0.5 h-3 w-3 text-destiny-orange"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </>
                  )}
                </button>
              )}

              {isAdmin ? (
                <Link
                  href="/"
                  className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:border-white/40 hover:text-white"
                >
                  ← View Site
                </Link>
              ) : (
                <Link
                  href="/new-here"
                  className="hidden whitespace-nowrap rounded-full bg-destiny-orange px-4 py-2 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 sm:inline-flex md:px-5 md:py-2.5"
                >
                  New Here?
                </Link>
              )}

              <button
                type="button"
                onClick={() => { setMobileOpen(!mobileOpen); setSearchOpen(false); }}
                aria-expanded={mobileOpen}
                aria-label="Toggle navigation"
                className="relative h-9 w-9 rounded-full text-white md:hidden"
              >
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-[5px]">
                  <span className={`block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${mobileOpen ? "translate-y-[7px] rotate-45" : ""}`} />
                  <span className={`block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
                  <span className={`block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${mobileOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
                </span>
              </button>
            </div>
          </div>

          {/* Global search panel — slides down below pill */}
          {!isAdmin && (
            <div
              className="overflow-hidden transition-all duration-300 ease-in-out"
              style={{
                maxHeight: searchOpen ? "520px" : "0px",
                opacity: searchOpen ? 1 : 0,
              }}
            >
              <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
            </div>
          )}

          {/* Mobile menu */}
          <div
            className="overflow-hidden transition-all duration-300 ease-in-out md:hidden"
            style={{
              maxHeight: mobileOpen ? "600px" : "0px",
              opacity: mobileOpen ? 1 : 0,
            }}
          >
            <div className="mt-2 rounded-2xl bg-white p-3 shadow-xl">
              {/* Sermons sub-toggle on mobile */}
              {pathname.startsWith("/sermons") && (
                <div className="mb-2 flex rounded-xl border border-black/8 bg-black/5 p-1">
                  {[
                    { label: "Sermons", href: "/sermons" },
                    { label: "Guest Speakers", href: "/sermons/guest-speakers" },
                  ].map((tab) => {
                    const active = pathname === tab.href;
                    return (
                      <Link
                        key={tab.href}
                        href={tab.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-bold transition ${
                          active ? "bg-white text-destiny-grey shadow-sm" : "text-destiny-grey/50 hover:text-destiny-grey"
                        }`}
                      >
                        {tab.label}
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Flat nav links */}
              {mobileNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-destiny-grey transition hover:bg-gray-50 hover:text-destiny-orange"
                >
                  {item.label}
                </Link>
              ))}

              {/* New Here CTA at bottom */}
              <div className="mt-2 border-t border-gray-100 pt-2">
                <Link
                  href="/new-here"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  New Here?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
