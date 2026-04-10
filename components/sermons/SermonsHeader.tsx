"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { useBanner } from "@/contexts/BannerContext";
import { useSermonSearch } from "@/lib/sermonSearchContext";

const navItems = [
  { href: "/whats-on", label: "What's on" },
  { href: "/sermons", label: "Sermons" },
  { href: "/serve", label: "Serve" },
  { href: "/about", label: "About" },
  { href: "/hire", label: "Hire" },
  { href: "/give", label: "Give" },
];

const tabs = [
  { label: "Sermons", href: "/sermons" },
  { label: "Guest Speakers", href: "/sermons/guest-speakers" },
];

const MAX_SUGGESTIONS = 6;

export default function SermonsHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { query, setQuery, suggestions: allSuggestions } = useSermonSearch();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const lastScrollY = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const banner = useBanner();
  const bannerOffset = banner.active ? "top-10" : "top-0";

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    setScrolled(y > 50);
    if (y > lastScrollY.current && y > 80) setHidden(true);
    else setHidden(false);
    lastScrollY.current = y;
  }, []);

  useEffect(() => {
    setMounted(true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (e.clientY < 80) setHidden(false); };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const showSearch = pathname === "/sermons" || pathname === "/sermons/guest-speakers";

  const filteredSuggestions = showSearch && query.trim().length >= 1
    ? allSuggestions
        .filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, MAX_SUGGESTIONS)
    : [];

  const showDropdown = searchFocused && filteredSuggestions.length > 0;
  const searchExpanded = searchFocused && showSearch;

  function navigateTo(id: string) {
    setSearchFocused(false);
    setActiveIdx(-1);
    setQuery("");
    router.push(`/sermons/${id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filteredSuggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      navigateTo(filteredSuggestions[activeIdx].id);
    } else if (e.key === "Escape") {
      setSearchFocused(false);
      setActiveIdx(-1);
      inputRef.current?.blur();
    }
  }

  function highlightMatch(title: string) {
    const idx = title.toLowerCase().indexOf(query.trim().toLowerCase());
    if (idx === -1) return <span>{title}</span>;
    return (
      <>
        {title.slice(0, idx)}
        <span className="text-white">{title.slice(idx, idx + query.trim().length)}</span>
        {title.slice(idx + query.trim().length)}
      </>
    );
  }

  return (
    <header
      className={`fixed left-0 right-0 z-50 ${bannerOffset}`}
      style={{
        transform: !mounted || hidden ? "translateY(-110%)" : "translateY(0)",
        transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-8">

        {/* Main header pill */}
        <div
          className={`flex items-center gap-4 rounded-full border px-6 py-3 backdrop-blur-md transition-all duration-300 ${
            scrolled
              ? "border-white/10 bg-destiny-grey/60 shadow-xl shadow-black/30"
              : "border-white/10 bg-destiny-grey/40 shadow-lg shadow-black/10"
          }`}
        >
          {/* Logo — always visible */}
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

          {/* Nav items — hidden when search is expanded */}
          {!searchExpanded && (
            <nav className="hidden flex-1 items-center gap-1 md:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    item.href === "/sermons" && pathname.startsWith("/sermons")
                      ? "text-destiny-orange"
                      : "text-white/90 hover:text-destiny-orange"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Search — expands to fill all space when focused */}
          {showSearch && (
            <div
              ref={containerRef}
              className={`relative transition-all duration-300 ${searchExpanded ? "flex-1" : "hidden md:block"}`}
            >
              <svg
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIdx(-1); }}
                onFocus={() => setSearchFocused(true)}
                onKeyDown={handleKeyDown}
                placeholder="Search sermons…"
                className={`rounded-full border border-white/10 bg-transparent py-2 pl-9 pr-8 text-sm text-white shadow-md shadow-black/20 transition-all duration-300 placeholder:text-white/35 focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20 ${
                  searchExpanded ? "w-full" : "w-44"
                }`}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                  aria-label="Clear search"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Predictive dropdown */}
              {showDropdown && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-destiny-grey/95 shadow-xl shadow-black/30 backdrop-blur-md">
                  {filteredSuggestions.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigateTo(s.id);
                      }}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                        i === activeIdx ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5 shrink-0 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5v14l11-7z" />
                      </svg>
                      <span className="truncate text-white/60">{highlightMatch(s.title)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CTA — hidden when search is expanded */}
          {!searchExpanded && (
            <div className="hidden shrink-0 md:block">
              <Link
                href="/new-here"
                className="whitespace-nowrap rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
              >
                New Here?
              </Link>
            </div>
          )}

          {/* Cancel button when expanded */}
          {searchExpanded && (
            <button
              type="button"
              onClick={() => { setSearchFocused(false); setQuery(""); inputRef.current?.blur(); }}
              className="hidden shrink-0 text-sm text-white/50 transition hover:text-white md:block"
            >
              Cancel
            </button>
          )}

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation"
            className="relative ml-auto h-10 w-10 shrink-0 rounded-full text-white transition md:hidden"
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

        {/* Sub-nav switcher — hidden while searching */}
        <div className={`mt-2 flex justify-center transition-all duration-200 ${query.trim() ? "invisible h-0 mt-0 overflow-hidden" : ""}`}>
          <div className="flex items-center rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-sm">
            {tabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setQuery("")}
                  className={`rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 ${
                    active ? "bg-white text-[#0d0d0d] shadow-sm" : "text-white/70 hover:text-white"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="mt-2 rounded-2xl border border-white/10 bg-destiny-grey/90 p-3 shadow-xl backdrop-blur-md">
            {showSearch && (
              <div className="relative mb-3">
                <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search sermons…"
                  className="w-full rounded-full border border-white/10 bg-transparent py-2.5 pl-9 pr-4 text-sm text-white shadow-md shadow-black/20 placeholder:text-white/35 focus:border-destiny-orange/50 focus:outline-none"
                />
              </div>
            )}
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`block rounded-xl px-4 py-3 text-sm font-bold transition ${
                  item.href === "/sermons" && pathname.startsWith("/sermons")
                    ? "bg-white/10 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
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
