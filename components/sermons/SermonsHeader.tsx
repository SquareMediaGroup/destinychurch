"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { useBanner } from "@/contexts/BannerContext";
import { useSermonSearch } from "@/lib/sermonSearchContext";

const navItems = [
  { href: "/whats-on", label: "What's on" },
  { href: "/sermons",  label: "Sermons"   },
  { href: "/serve",    label: "Serve"      },
  { href: "/about",    label: "About"      },
  { href: "/hire",     label: "Hire"       },
  { href: "/give",     label: "Give"       },
];

const tabs = [
  { label: "Sermons",        href: "/sermons"               },
  { label: "Guest Speakers", href: "/sermons/guest-speakers" },
];

const MAX_SUGGESTIONS = 6;

export default function SermonsHeader() {
  const pathname = usePathname();
  const router   = useRouter();
  const { query, setQuery, suggestions: allSuggestions } = useSermonSearch();

  const [expanded,       setExpanded]       = useState(false);
  const [isMobile,       setIsMobile]       = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled,       setScrolled]       = useState(false);
  const [hidden,         setHidden]         = useState(false);
  const [mounted,        setMounted]        = useState(false);
  const [searchFocused,  setSearchFocused]  = useState(false);
  const [activeIdx,      setActiveIdx]      = useState(-1);

  const lastScrollY        = useRef(0);
  const inputRef           = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const headerRef          = useRef<HTMLElement>(null);

  const banner      = useBanner();
  const bannerOffset = banner.active ? "top-10" : "top-0";
  const showSearch   = pathname.startsWith("/sermons");

  /* ── scroll hide / show ── */
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
    const fn = (e: MouseEvent) => { if (e.clientY < 80) setHidden(false); };
    window.addEventListener("mousemove", fn, { passive: true });
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  /* ── mobile detection ── */
  useEffect(() => {
    const mql = window.matchMedia("(pointer: coarse)");
    setIsMobile(mql.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", h);
    return () => mql.removeEventListener("change", h);
  }, []);

  /* ── click-outside: close search dropdown & collapse mobile ── */
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
        setActiveIdx(-1);
      }
      if (
        isMobile && expanded &&
        headerRef.current &&
        !headerRef.current.contains(e.target as Node)
      ) {
        setExpanded(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [isMobile, expanded]);

  /* ── predictive search ── */
  const filteredSuggestions =
    showSearch && query.trim().length >= 1
      ? allSuggestions
          .filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase()))
          .slice(0, MAX_SUGGESTIONS)
      : [];

  const showDropdown = searchFocused && filteredSuggestions.length > 0;

  function navigateTo(id: string) {
    setSearchFocused(false);
    setActiveIdx(-1);
    setQuery("");
    router.push(`/sermons/${id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filteredSuggestions.length - 1)); }
    else if (e.key === "ArrowUp")  { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter" && activeIdx >= 0)  { e.preventDefault(); navigateTo(filteredSuggestions[activeIdx].id); }
    else if (e.key === "Escape") { setSearchFocused(false); setActiveIdx(-1); inputRef.current?.blur(); }
  }

  function highlightMatch(title: string) {
    const q   = query.trim().toLowerCase();
    const idx = title.toLowerCase().indexOf(q);
    if (idx === -1) return <span>{title}</span>;
    return (
      <>
        {title.slice(0, idx)}
        <span className="text-white">{title.slice(idx, idx + q.length)}</span>
        {title.slice(idx + q.length)}
      </>
    );
  }

  /* ── shared inline styles ── */
  const glassClass = scrolled
    ? "bg-destiny-grey/60 shadow-xl shadow-black/30"
    : "bg-destiny-grey/40 shadow-lg shadow-black/10";

  // Elements outside the pill fade out as pill expands
  const outerFade: React.CSSProperties = {
    opacity:       expanded ? 0 : 1,
    pointerEvents: expanded ? "none" : "auto",
    transition:    "opacity 0.15s ease",
  };

  // Fade in with delay (wait for pill to expand), fade out immediately before pill collapses
  const innerFade: React.CSSProperties = {
    opacity:       expanded ? 1 : 0,
    pointerEvents: expanded ? "auto" : "none",
    transition:    expanded ? "opacity 0.2s ease 0.25s" : "opacity 0.1s ease",
  };

  return (
    <header
      ref={headerRef}
      className={`fixed left-0 right-0 z-50 ${bannerOffset}`}
      style={{
        transform:  !mounted || hidden ? "translateY(-110%)" : "translateY(0)",
        transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Dark gradient — fades in when header is expanded so content behind stays readable */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-36"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)",
          opacity:    (expanded || searchFocused) ? 1 : 0.45,
          transition: "opacity 0.45s ease",
          zIndex: -1,
        }}
      />
      <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-8">

        {/* ── Main row ── */}
        <div className="relative h-14">

          {/* LEFT — search bar (desktop only) */}
          {showSearch && (
            <div
              ref={searchContainerRef}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-30 hidden md:block"
              style={outerFade}
            >
              <div className="relative">
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
                  className="w-96 rounded-full border border-white/30 bg-[#111111] py-2.5 pl-9 pr-8 text-sm text-white placeholder:text-white/50 focus:border-destiny-orange/60 focus:outline-none focus:ring-2 focus:ring-destiny-orange/25"
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
                  <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-destiny-grey/95 shadow-xl shadow-black/30 backdrop-blur-md">
                    {filteredSuggestions.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); navigateTo(s.id); }}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition ${
                          i === activeIdx ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"
                        }`}
                      >
                        <svg className="h-3.5 w-3.5 shrink-0 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        <span className="truncate">{highlightMatch(s.title)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CENTER — the morphing pill (flex-centered so it expands symmetrically) */}
          {/* pointer-events-none on the wrapper so the full-width container never swallows clicks meant for search/toggle */}
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <div
              className={`pointer-events-auto relative h-14 overflow-hidden rounded-full border border-white/10 backdrop-blur-md transition-shadow ${glassClass}`}
              style={{
                width:      expanded ? "100%" : "3.5rem",
                transition: "width 0.45s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor:     isMobile ? "pointer" : "default",
              }}
              onMouseEnter={!isMobile ? () => { setExpanded(true); setSearchFocused(false); } : undefined}
              onMouseLeave={!isMobile ? () => setExpanded(false) : undefined}
              onClick={isMobile ? () => setExpanded((v) => !v) : undefined}
            >
              {/* Small icon — centered, fades out */}
              <div
                style={{
                  position:  "absolute",
                  top:       "50%",
                  left:      "50%",
                  transform: "translate(-50%, -50%)",
                  opacity:   expanded ? 0 : 1,
                  transition: "opacity 0.15s ease",
                  pointerEvents: "none",
                }}
              >
                <div className="relative h-8 w-8">
                  <Image src="/img/brand/destiny-icon.svg" alt="Destiny Church" fill sizes="32px" className="object-contain" />
                </div>
              </div>

              {/* Full logo — left-aligned, fades in, links to home */}
              <div
                style={{
                  position:  "absolute",
                  top:       "50%",
                  left:      "1.5rem",
                  transform: "translateY(-50%)",
                  ...innerFade,
                }}
              >
                <Link href="/" onClick={() => setExpanded(false)}>
                  <div className="relative h-9 w-[170px]">
                    <Image src="/img/brand/destiny-logo-color-white.svg" alt="Destiny Church" fill sizes="170px" priority className="object-contain" />
                  </div>
                </Link>
              </div>

              {/* Nav items — desktop, centered, fade in */}
              <div
                className="absolute inset-0 hidden items-center justify-center md:flex"
                style={innerFade}
              >
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                      item.href === "/sermons" && pathname.startsWith("/sermons")
                        ? "text-destiny-orange"
                        : "text-white/90 hover:text-destiny-orange"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* New Here? — desktop, fade in */}
              <div
                className="absolute top-1/2 right-5 -translate-y-1/2 hidden md:block"
                style={innerFade}
              >
                <Link
                  href="/new-here"
                  className="whitespace-nowrap rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
                >
                  New Here?
                </Link>
              </div>

              {/* Hamburger — mobile only, fade in when expanded */}
              <button
                type="button"
                className="absolute top-1/2 right-4 -translate-y-1/2 flex h-10 w-10 items-center justify-center text-white md:hidden"
                style={{
                  opacity:       (expanded && isMobile) ? 1 : 0,
                  pointerEvents: (expanded && isMobile) ? "auto" : "none",
                  transition:    "opacity 0.2s ease 0.25s",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setMobileMenuOpen((v) => !v);
                }}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <span className="flex flex-col items-center gap-[5px]">
                    <span className="block h-0.5 w-5 bg-current" />
                    <span className="block h-0.5 w-5 bg-current" />
                    <span className="block h-0.5 w-5 bg-current" />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* RIGHT — Sermons / Guest Speakers toggle (desktop only) */}
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 z-30 hidden md:flex"
            style={outerFade}
          >
            <div className="flex items-center rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-sm">
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => setQuery("")}
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

        </div>{/* end .relative.h-14 */}

        {/* Mobile dropdown */}
        {isMobile && mobileMenuOpen && (
          <div className="mt-2 rounded-2xl border border-white/10 bg-destiny-grey/90 p-3 shadow-xl backdrop-blur-md">
            {/* Search */}
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
                  className="w-full rounded-full border border-white/10 bg-transparent py-2.5 pl-9 pr-4 text-sm text-white placeholder:text-white/35 focus:border-destiny-orange/50 focus:outline-none"
                />
              </div>
            )}

            {/* Section toggle */}
            <div className="mb-2 flex rounded-xl border border-white/10 p-1">
              {tabs.map((tab) => {
                const active = pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    onClick={() => { setQuery(""); setMobileMenuOpen(false); setExpanded(false); }}
                    className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-bold transition ${
                      active ? "bg-white text-[#0d0d0d]" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            {/* Nav links */}
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { setMobileMenuOpen(false); setExpanded(false); }}
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
                onClick={() => { setMobileMenuOpen(false); setExpanded(false); }}
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
