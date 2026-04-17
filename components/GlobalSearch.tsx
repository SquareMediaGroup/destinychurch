"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";

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

const QUICK_LINKS = SITE_PAGES.slice(0, 8);

export default function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResult(null);
      setLoading(false);
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    if (!value.trim() || value.trim().length > 150) {
      setResult(null);
      setLoading(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value.trim())}`);
        const data: SearchResponse = await res.json();
        setResult(data);
      } catch {
        setResult({ answer: null, page: null, ctaLabel: null, sermons: [], aiSermons: [] });
      } finally {
        setLoading(false);
      }
    }, 700);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  if (!open) return null;

  const pageMatches = query.trim().length >= 1
    ? SITE_PAGES.filter((p) =>
        p.title.toLowerCase().includes(query.trim().toLowerCase())
      ).slice(0, 3)
    : [];

  const hasPages      = pageMatches.length > 0;
  const hasSermons    = (result?.sermons?.length ?? 0) > 0;
  const hasAiSermons  = (result?.aiSermons?.length ?? 0) > 0;
  const hasAnswer     = Boolean(result?.answer);
  const showEmpty     = query.trim().length > 2 && !loading && !hasPages && !hasSermons && !hasAiSermons && !hasAnswer;
  const showResults   = hasPages || hasSermons || hasAiSermons || hasAnswer || showEmpty;
  const showQuickLinks = !query.trim() && !showResults;

  return (
    <div className="flex justify-center px-4 pt-3 pb-2 lg:px-8">
      <div className="w-full md:max-w-[40%]">

        {/* Smart Search label */}
        <div className="mb-2.5 flex items-center gap-2 px-0.5">
          <div className="flex items-center gap-1.5 rounded-full border border-destiny-orange/25 bg-destiny-orange/10 px-2.5 py-1">
            <svg className="h-3 w-3 text-destiny-orange" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <span className="text-[10px] font-bold uppercase tracking-widest text-destiny-orange">Smart Search</span>
          </div>
          <span className="text-xs text-white/20">AI-powered</span>
        </div>

        {/* Search input */}
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search Destiny Church…"
              className="w-full rounded-2xl border border-white/12 bg-white/5 py-3.5 pl-11 pr-11 text-sm text-white placeholder:text-white/35 shadow-xl backdrop-blur-md transition-all duration-200 focus:border-destiny-orange/40 focus:bg-white/[0.08] focus:outline-none focus:ring-2 focus:ring-destiny-orange/15"
            />

            {loading ? (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-destiny-orange" />
              </div>
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResult(null);
                  inputRef.current?.focus();
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white/50 transition hover:bg-white/20 hover:text-white"
                aria-label="Clear search"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        </form>

        {/* Quick links — shown when input is empty */}
        {showQuickLinks && (
          <div className="mt-1.5 overflow-hidden rounded-2xl border border-white/10 bg-destiny-grey/55 shadow-2xl backdrop-blur-md">
            <p className="px-4 pt-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/25">
              Browse
            </p>
            <div className="grid grid-cols-2 gap-0.5 px-2 pb-2">
              {QUICK_LINKS.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  onClick={onClose}
                  className="group flex items-center gap-2.5 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.08]"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-destiny-orange/40 transition group-hover:bg-destiny-orange" />
                  <span className="text-sm text-white/55 transition group-hover:text-white/85">{page.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Results panel */}
        {showResults && (
          <div className="mt-1.5 overflow-hidden rounded-2xl border border-white/12 bg-destiny-grey/60 shadow-2xl backdrop-blur-md">

            {/* Page matches */}
            {hasPages && (
              <>
                <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/25">
                  Pages
                </p>
                {pageMatches.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    onClick={onClose}
                    className="group flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.08]"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
                      <svg className="h-3.5 w-3.5 text-white/40 transition group-hover:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </div>
                    <span className="flex-1 text-sm text-white/65 transition group-hover:text-white">{page.title}</span>
                    <svg className="h-3.5 w-3.5 shrink-0 text-white/20 opacity-0 transition group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                ))}
              </>
            )}

            {/* Sermon matches */}
            {hasSermons && (
              <>
                {hasPages && <div className="mx-4 border-t border-white/[0.08]" />}
                <p className="px-4 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/25">
                  Sermons
                </p>
                {result!.sermons.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sermons/${s.id}`}
                    onClick={onClose}
                    className="group flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.08]"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-destiny-orange/10">
                      <svg className="h-3.5 w-3.5 text-destiny-orange/70 transition group-hover:text-destiny-orange" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <span className="flex-1 truncate text-sm text-white/65 transition group-hover:text-white">{s.title}</span>
                    <svg className="h-3.5 w-3.5 shrink-0 text-white/20 opacity-0 transition group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                ))}
              </>
            )}

            {/* AI Overview */}
            {hasAnswer && (
              <>
                {(hasPages || hasSermons) && <div className="mx-4 border-t border-white/[0.08]" />}
                <div className="p-4">
                  <div className="rounded-xl border border-destiny-orange/15 bg-destiny-orange/5 p-3.5">
                    <div className="mb-2.5 flex items-center gap-2">
                      <div className="flex items-center gap-1.5 rounded-full bg-destiny-orange/15 px-2 py-0.5">
                        <svg className="h-3 w-3 text-destiny-orange" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-destiny-orange">
                          AI Overview
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed text-white/80">{result!.answer}</p>

                    {hasAiSermons && (
                      <div className="mt-3 space-y-1">
                        {result!.aiSermons.map((s) => (
                          <Link
                            key={s.id}
                            href={`/sermons/${s.id}`}
                            onClick={onClose}
                            className="group flex items-center gap-2 rounded-xl px-2.5 py-2 transition hover:bg-destiny-orange/10"
                          >
                            <svg className="h-3.5 w-3.5 shrink-0 text-destiny-orange/50 transition group-hover:text-destiny-orange" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                            <span className="flex-1 truncate text-xs text-white/65 transition group-hover:text-white/90">{s.title}</span>
                          </Link>
                        ))}
                      </div>
                    )}

                    {result!.page && result!.ctaLabel && !hasAiSermons && (
                      <Link
                        href={result!.page}
                        onClick={onClose}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-destiny-orange px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
                      >
                        {result!.ctaLabel}
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* No results */}
            {showEmpty && (
              <div className="flex flex-col items-center gap-2 px-4 py-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                  <svg className="h-5 w-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-white/40">No results for &ldquo;{query}&rdquo;</p>
                <p className="text-xs text-white/20">Try a different search term</p>
              </div>
            )}

            {/* Footer keyboard hint */}
            {(hasPages || hasSermons || hasAnswer) && query.trim() && (
              <div className="flex items-center justify-center gap-1.5 border-t border-white/[0.08] px-4 py-2.5">
                <span className="text-xs text-white/25">Press</span>
                <kbd className="rounded border border-white/15 bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-white/35">↵</kbd>
                <span className="text-xs text-white/25">for full results</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
