"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
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

const whatsOnDropdown = [
  { href: "/whats-on#events", label: "Events" },
  { href: "/whats-on#courses", label: "Courses" },
  { href: "/alpha", label: "Alpha" },
  { href: "/missions", label: "Missions" },
  { href: "/whats-on#highlights", label: "Highlights" },
];

const navItems = [
  { label: "What's on", href: "/whats-on", dropdown: whatsOnDropdown },
  { href: "/sermons", label: "Sermons" },
  { href: "/serve", label: "Serve" },
  { label: "About", href: "/about", dropdown: aboutDropdown },
  { href: "/give", label: "Give" },
];

const mobileNavItems = [
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
}: {
  items: { href: string; label: string }[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2">
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

export default function ChurchHeader() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const bridgeInputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    setScrolled(y > 50);
    if (y > lastScrollY.current && y > 80) {
      setHidden(true);
      setOpenDropdown(null);
      setSearchOpen(false);
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
        setSearchOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (pathname.startsWith("/sermons")) return null;

  const isAdmin = pathname.startsWith("/admin");
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

      <style>{`
        @keyframes corner-pulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.25); }
        }
      `}</style>

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
        className={`fixed left-0 right-0 z-50 ${bannerOffset}`}
        style={{
          transform: !mounted || hidden ? "translateY(-110%)" : "translateY(0)",
          transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
          {/* Pill */}
          <div
            className={`flex items-center justify-between rounded-full border px-4 py-2 backdrop-blur-md transition-all duration-300 md:px-6 ${
              scrolled
                ? "border-white/10 bg-destiny-grey/60 shadow-xl shadow-black/30"
                : "border-white/10 bg-destiny-grey/40 shadow-lg shadow-black/10"
            }`}
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
                      <div key={item.label} className="relative flex items-center">
                        <Link
                          href={item.href!}
                          className="rounded-full py-2 pl-4 pr-1 text-sm font-medium text-white/90 transition hover:text-destiny-orange"
                        >
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                          className="rounded-full px-1.5 py-2 text-white/90 transition hover:text-destiny-orange"
                          aria-label={`Toggle ${item.label} menu`}
                        >
                          <svg
                            className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <Dropdown
                          items={item.dropdown}
                          open={isOpen}
                          onClose={() => setOpenDropdown(null)}
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
              {/* Search icon — desktop, non-admin */}
              {!isAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchOpen((v) => !v);
                    setMobileOpen(false);
                  }}
                  className={`hidden items-center justify-center rounded-full p-2 md:flex ${
                    searchOpen
                      ? "bg-white/10 text-destiny-orange"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                  aria-label={searchOpen ? "Close search" : "Open search"}
                >
                  {searchOpen ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
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
                className="relative h-9 w-9 rounded-full text-white transition md:hidden"
              >
                <span
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-[5px] transition-opacity duration-200 ${
                    mobileOpen ? "opacity-0" : "opacity-100"
                  }`}
                >
                  <span className="block h-0.5 w-5 bg-current" />
                  <span className="block h-0.5 w-5 bg-current" />
                  <span className="block h-0.5 w-5 bg-current" />
                </span>
                <span
                  className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                    mobileOpen ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
          {mobileOpen && (
            <div className="mt-2 rounded-2xl bg-white p-3 shadow-xl md:hidden">

              {/* Logo */}
              <div className="mb-3 px-1 pt-1">
                <div className="relative h-7 w-[132px]">
                  <Image
                    src="/img/brand/Destiny SVG Logos/Destiny Full Logo SVG/Full Logo Colour.svg"
                    alt="Destiny Church"
                    fill
                    sizes="132px"
                    className="object-contain object-left"
                  />
                </div>
              </div>

              {/* Smart Search button */}
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    bridgeInputRef.current?.focus(); // synchronous focus — tells iOS keyboard to appear
                    setMobileOpen(false);
                    setSearchOpen(true);
                  }}
                  className="relative mb-3 w-full overflow-hidden rounded-2xl"
                  style={{ background: "rgba(10,10,18,0.96)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  {/* Corner glows */}
                  <span
                    className="pointer-events-none absolute -left-3 -top-3 h-14 w-14 rounded-full blur-xl"
                    style={{ background: "radial-gradient(circle, rgba(168,85,247,1), transparent 70%)", animation: "corner-pulse 3s ease-in-out infinite" }}
                  />
                  <span
                    className="pointer-events-none absolute -right-3 -top-3 h-14 w-14 rounded-full blur-xl"
                    style={{ background: "radial-gradient(circle, rgba(249,115,22,1), transparent 70%)", animation: "corner-pulse 3s ease-in-out infinite 0.75s" }}
                  />
                  <span
                    className="pointer-events-none absolute -bottom-3 -left-3 h-14 w-14 rounded-full blur-xl"
                    style={{ background: "radial-gradient(circle, rgba(59,130,246,1), transparent 70%)", animation: "corner-pulse 3s ease-in-out infinite 1.5s" }}
                  />
                  <span
                    className="pointer-events-none absolute -bottom-3 -right-3 h-14 w-14 rounded-full blur-xl"
                    style={{ background: "radial-gradient(circle, rgba(236,72,153,1), transparent 70%)", animation: "corner-pulse 3s ease-in-out infinite 2.25s" }}
                  />
                  {/* Content */}
                  <div className="relative flex items-center gap-3 px-4 py-3">
                    <svg
                      className="h-4 w-4 shrink-0 text-white/80"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white">Smart Search</p>
                      <p className="text-xs text-white/40">Ask anything about Destiny</p>
                    </div>
                    <svg
                      className="ml-auto h-4 w-4 shrink-0 text-white/25"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                  </div>
                </button>
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
          )}
        </div>
      </header>
    </>
  );
}
