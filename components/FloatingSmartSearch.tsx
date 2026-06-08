"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import { useCookieConsent } from "@/lib/cookieConsent";

interface SermonMatch {
  id: string;
  title: string;
}

interface SearchResponse {
  answer: string | null;
  page: string | null;
  ctaLabel: string | null;
  sermons: SermonMatch[];
  aiSermons: SermonMatch[];
}

const PLACEHOLDER_PROMPTS = [
  "When does the service start?",
  "Is there Kids Church?",
  "How do I get baptised?",
  "Where do I park?",
  "What is Alpha?",
  "How can I serve?",
  "Where can I find sermons?",
  "How do I join a Connect Group?",
];

const SMART_SEARCH_SEEN_KEY = "destiny-smart-search-seen";

const SITE_PAGES = [
  { title: "Sermons",      href: "/sermons"       },
  { title: "Give",         href: "/give"           },
  { title: "Visit",        href: "/visit"          },
  { title: "New Here",     href: "/new-here"       },
  { title: "What's On",    href: "/whats-on"       },
  { title: "Alpha",        href: "/alpha"          },
  { title: "Serve",        href: "/serve"          },
  { title: "About",        href: "/about"          },
  { title: "Missions",     href: "/missions"       },
  { title: "Contact",      href: "/contact"        },
  { title: "Youth",        href: "/youth"          },
  { title: "Young Adults", href: "/young-adults"   },
  { title: "Kids",         href: "/kids"           },
  { title: "Safeguarding", href: "/safeguarding"   },
  { title: "Beliefs",      href: "/beliefs"        },
  { title: "Connect",      href: "/connect"        },
];

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

export default function FloatingSmartSearch() {
  const pathname = usePathname();
  const { decided, allowAll, denyOptional } = useCookieConsent();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [showFirstUse, setShowFirstUse] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusOnOpenRef = useRef(false);

  // The bar should not minimise while the user is actively searching (focused or
  // has a query/results showing); the scroll handler reads this via a ref.
  const interacting = focused || query.trim().length > 0;
  const interactingRef = useRef(interacting);
  interactingRef.current = interacting;

  // Open the pill. Pass focus=true for explicit user intent (tapping the icon)
  // so the input is focused; scroll-driven opens pass false to avoid stealing
  // focus / popping the mobile keyboard.
  const openBar = useCallback((focus: boolean) => {
    focusOnOpenRef.current = focus;
    setExpanded(true);
  }, []);

  const collapse = useCallback(() => {
    setExpanded(false);
    setFocused(false);
    setQuery("");
    setResult(null);
    setLoading(false);
  }, []);

  // First-use banner + initial placeholder, read once on mount.
  useEffect(() => {
    setPlaceholderIndex(Math.floor(Math.random() * PLACEHOLDER_PROMPTS.length));
    try {
      setShowFirstUse(!localStorage.getItem(SMART_SEARCH_SEEN_KEY));
    } catch {
      setShowFirstUse(false);
    }
  }, []);

  // Focus the input only when the bar was opened by explicit user intent.
  useEffect(() => {
    if (expanded && focusOnOpenRef.current) {
      focusOnOpenRef.current = false;
      // Wait for the width morph before focusing so the caret lands on the
      // fully-grown pill rather than the collapsing circle.
      const t = setTimeout(() => inputRef.current?.focus(), 260);
      return () => clearTimeout(t);
    }
  }, [expanded]);

  // Minimise to the circle while scrolling; reopen to the pill once scrolling
  // stops. Skipped while actively searching so results stay put.
  useEffect(() => {
    const onScroll = () => {
      if (interactingRef.current) return;
      setExpanded(false);
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        if (!interactingRef.current) openBar(false);
      }, 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(scrollTimerRef.current);
    };
  }, [openBar]);

  // Rotate the placeholder prompt while expanded and empty.
  useEffect(() => {
    if (!expanded || query) return;
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDER_PROMPTS.length);
    }, 2800);
    return () => clearInterval(id);
  }, [expanded, query]);

  const dismissFirstUse = useCallback(() => {
    setShowFirstUse(false);
    try {
      localStorage.setItem(SMART_SEARCH_SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  // Collapse on navigation.
  useEffect(() => {
    collapse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Escape closes; click-outside collapses.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") collapse();
    };
    const onDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        collapse();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [expanded, collapse]);

  const runSearch = useCallback((value: string) => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > 150) {
      setResult(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
      .then((res) => res.json())
      .then((data: SearchResponse) => setResult(data))
      .catch(() =>
        setResult({ answer: null, page: null, ctaLabel: null, sermons: [], aiSermons: [] })
      )
      .finally(() => setLoading(false));
  }, []);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (value && showFirstUse) dismissFirstUse();
    clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim().length > 150) {
      setResult(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(value), 700);
  }, [showFirstUse, dismissFirstUse, runSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    // Run the search inline and stay on the page — no navigation to a results
    // page. Skip the debounce so Return fires immediately and shows loading.
    clearTimeout(debounceRef.current);
    if (showFirstUse) dismissFirstUse();
    runSearch(query);
  }

  if (pathname.startsWith("/admin")) return null;

  const pageMatches = query.trim().length >= 1
    ? SITE_PAGES.filter((p) =>
        p.title.toLowerCase().includes(query.trim().toLowerCase())
      ).slice(0, 3)
    : [];

  const hasPages      = pageMatches.length > 0;
  const hasSermons    = (result?.sermons?.length ?? 0) > 0;
  const hasAiSermons  = (result?.aiSermons?.length ?? 0) > 0;
  const hasAnswer     = Boolean(result?.answer);
  const showEmpty     =
    query.trim().length > 2 && !loading && !hasPages && !hasSermons && !hasAiSermons && !hasAnswer;
  const showPanel     = expanded && (hasPages || hasSermons || hasAiSermons || hasAnswer || showEmpty || loading);
  const showConsent   = expanded && !decided;
  const showWelcome   = expanded && decided && showFirstUse && !query && !showPanel;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        ref={containerRef}
        className="pointer-events-auto relative flex w-full flex-col items-center"
        style={{ maxWidth: "min(calc(100vw - 2rem), 28rem)" }}
      >
        {/* Panels stack above the bar and expand upward */}
        {(showConsent || showWelcome || showPanel) && (
          <div className="floating-search-panels absolute bottom-full left-0 right-0 mb-2">
            {/* Cookie consent gate */}
            {showConsent && (
              <div className="rounded-2xl border border-white/15 bg-destiny-grey/60 p-5 shadow-2xl backdrop-blur-md">
                <div className="mb-3 flex items-center gap-1.5">
                  <SparkleIcon className="h-3.5 w-3.5 text-destiny-orange" />
                  <span className="text-xs font-bold uppercase tracking-widest text-white/40">Smart Search</span>
                </div>
                <p className="text-sm font-semibold text-white">Accept cookies to use Smart Search</p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                  Smart Search uses AI to answer your questions. Accept cookies to enable this feature.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={allowAll}
                    className="rounded-full bg-destiny-orange px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-95"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={denyOptional}
                    className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/60 transition hover:border-destiny-orange hover:text-white"
                  >
                    Essential Only
                  </button>
                  <button
                    onClick={collapse}
                    className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white/30 transition hover:text-white/60"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* First-use explanation */}
            {showWelcome && (
              <div className="rounded-2xl border border-white/10 bg-destiny-grey/70 p-4 shadow-xl backdrop-blur-md">
                <div className="mb-2 flex items-center gap-1.5">
                  <SparkleIcon className="h-3.5 w-3.5 text-destiny-orange" />
                  <span className="text-xs font-bold uppercase tracking-widest text-destiny-orange">
                    Welcome to Smart Search
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-white/75">
                  Ask Destiny anything &mdash; service times, kids&rsquo; ministry, how to get involved, sermon topics. Smart Search uses AI to point you to the right page or sermon in seconds.
                </p>
                <button
                  type="button"
                  onClick={dismissFirstUse}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-destiny-orange px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
                >
                  Got it
                </button>
              </div>
            )}

            {/* Results panel */}
            {showPanel && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-destiny-grey/70 shadow-2xl backdrop-blur-md">

                {/* Loading skeleton */}
                {loading && !hasAnswer && !hasPages && !hasSermons && (
                  <div className="space-y-2.5 px-4 py-4">
                    <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
                    <div className="h-3 animate-pulse rounded bg-white/10" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
                  </div>
                )}

                {/* Page matches */}
                {hasPages && pageMatches.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    onClick={collapse}
                    className="group flex items-center gap-3 px-4 py-3 text-sm text-white/60 transition hover:bg-white/8 hover:text-white"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white/8 text-white/30 transition group-hover:bg-destiny-orange/20 group-hover:text-destiny-orange">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <span className="block">{page.title}</span>
                      <span className="block text-[11px] text-white/25">destinytees.uk{page.href}</span>
                    </div>
                  </Link>
                ))}

                {/* Sermon matches */}
                {hasSermons && (
                  <>
                    {hasPages && <div className="mx-4 border-t border-white/8" />}
                    <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-white/30">
                      Sermons
                    </p>
                    {result!.sermons.map((s) => (
                      <Link
                        key={s.id}
                        href={`/sermons/${s.id}`}
                        onClick={collapse}
                        className="group flex items-center gap-3 px-4 py-3 text-sm text-white/60 transition hover:bg-white/8 hover:text-white"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-destiny-orange/15 text-destiny-orange/60 transition group-hover:bg-destiny-orange group-hover:text-white">
                          <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        <span className="truncate">{s.title}</span>
                      </Link>
                    ))}
                  </>
                )}

                {/* AI Overview */}
                {hasAnswer && (
                  <>
                    {(hasPages || hasSermons) && <div className="mx-4 border-t border-white/8" />}
                    <div className="px-4 py-4">
                      {/* Header */}
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <SparkleIcon className="h-3.5 w-3.5 text-destiny-orange" />
                          <span className="text-xs font-bold uppercase tracking-wider text-destiny-orange">
                            AI Overview
                          </span>
                        </div>
                        <span className="text-[10px] text-white/25">destinytees.uk</span>
                      </div>

                      {/* Answer */}
                      <p className="text-sm leading-relaxed text-white/75">{result!.answer}</p>

                      {/* AI-suggested sermons */}
                      {hasAiSermons && (
                        <div className="mt-3 space-y-0.5">
                          {result!.aiSermons.map((s) => (
                            <Link
                              key={s.id}
                              href={`/sermons/${s.id}`}
                              onClick={collapse}
                              className="group flex items-center gap-2.5 rounded-xl px-2 py-2 text-xs text-white/60 transition hover:bg-white/8 hover:text-white"
                            >
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-destiny-orange/15 text-destiny-orange/60 transition group-hover:bg-destiny-orange group-hover:text-white">
                                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                              <span className="truncate">{s.title}</span>
                            </Link>
                          ))}
                        </div>
                      )}

                      {/* CTA */}
                      {result!.page && result!.ctaLabel && !hasAiSermons && (
                        <Link
                          href={result!.page}
                          onClick={collapse}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-destiny-orange px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
                        >
                          {result!.ctaLabel}
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </>
                )}

                {/* No results */}
                {showEmpty && (
                  <p className="px-4 py-6 text-center text-sm text-white/30">
                    No results found for &ldquo;{query}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Morphing bar: circle (collapsed) <-> pill (expanded) */}
        <div
          className={`search-glow floating-search-morph relative h-14 rounded-full border border-white/10 shadow-xl shadow-black/30 backdrop-blur-md ${
            expanded ? "is-expanded" : ""
          } ${expanded && loading ? "is-loading" : ""}`}
          style={{
            width: expanded ? "min(calc(100vw - 2rem), 28rem)" : "3.5rem",
            backgroundColor: "rgba(54, 63, 72, 0.7)",
          }}
        >
          {/* Collapsed: circular trigger */}
          <button
            type="button"
            onClick={() => openBar(true)}
            aria-label="Open Smart Search"
            aria-hidden={expanded}
            tabIndex={expanded ? -1 : 0}
            className={`floating-search-trigger absolute inset-0 flex items-center justify-center text-white transition-opacity ${
              expanded ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <span className="relative">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <SparkleIcon className="absolute -right-1.5 -top-1.5 h-2.5 w-2.5 text-destiny-orange" />
            </span>
          </button>

          {/* Expanded: input form */}
          <form
            onSubmit={handleSubmit}
            aria-hidden={!expanded}
            className={`floating-search-form absolute inset-0 flex items-center transition-opacity ${
              expanded ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <div className="relative h-full w-full">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={PLACEHOLDER_PROMPTS[placeholderIndex]}
                tabIndex={expanded ? 0 : -1}
                className="relative z-10 h-full w-full rounded-full bg-transparent py-3.5 pl-5 pr-20 text-sm text-white placeholder:text-white/50 focus:outline-none"
              />
              {/* Clear / loading indicator */}
              {loading ? (
                <div className="absolute right-12 top-1/2 z-20 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-destiny-orange" />
                </div>
              ) : query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResult(null);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-12 top-1/2 z-20 -translate-y-1/2 text-white/40 transition hover:text-white/70"
                  aria-label="Clear search"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ) : null}
              {/* Collapse button */}
              <button
                type="button"
                onClick={collapse}
                tabIndex={expanded ? 0 : -1}
                className="absolute right-3 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
                aria-label="Close Smart Search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
