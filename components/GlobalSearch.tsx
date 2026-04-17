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
  const showEmpty     =
    query.trim().length > 2 && !loading && !hasPages && !hasSermons && !hasAiSermons && !hasAnswer;
  const showPanel     = hasPages || hasSermons || hasAiSermons || hasAnswer || showEmpty;

  return (
    <div className="flex justify-center px-4 pt-3 pb-2 lg:px-8">
      <div className="w-full md:max-w-[40%]">
        {/* Search input */}
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Search Anything Destiny…"
              className="w-full rounded-full border border-white/15 bg-destiny-grey/50 py-3.5 pl-12 pr-10 text-sm text-white placeholder:text-white/50 shadow-xl backdrop-blur-md focus:border-destiny-orange/50 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
            />
            {loading ? (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
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
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        </form>

        {/* Results panel */}
        {showPanel && (
          <div className="mt-1.5 overflow-hidden rounded-2xl border border-white/15 bg-destiny-grey/60 shadow-2xl backdrop-blur-md">

            {/* Page matches */}
            {hasPages && pageMatches.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <svg className="h-4 w-4 shrink-0 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                {page.title}
              </Link>
            ))}

            {/* Sermon matches */}
            {hasSermons && (
              <>
                {hasPages && <div className="mx-4 border-t border-white/10" />}
                <p className="px-4 pb-1 pt-3 text-xs font-bold uppercase tracking-wider text-white/30">
                  Sermons
                </p>
                {result!.sermons.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sermons/${s.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg className="h-4 w-4 shrink-0 text-destiny-orange/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span className="truncate">{s.title}</span>
                  </Link>
                ))}
              </>
            )}

            {/* AI Overview */}
            {hasAnswer && (
              <>
                {(hasPages || hasSermons) && <div className="mx-4 border-t border-white/10" />}
                <div className="px-4 py-4">
                  <div className="mb-2 flex items-center gap-2">
                    <svg
                      className="h-3.5 w-3.5 text-destiny-orange"
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
                    <span className="text-xs font-bold uppercase tracking-wider text-destiny-orange">
                      AI Overview
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/80">{result!.answer}</p>

                  {/* AI-suggested sermons */}
                  {hasAiSermons && (
                    <div className="mt-3 space-y-1">
                      {result!.aiSermons.map((s) => (
                        <Link
                          key={s.id}
                          href={`/sermons/${s.id}`}
                          onClick={onClose}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                          <svg className="h-3.5 w-3.5 shrink-0 text-destiny-orange/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          <span className="truncate">{s.title}</span>
                        </Link>
                      ))}
                    </div>
                  )}

                  {result!.page && result!.ctaLabel && !hasAiSermons && (
                    <Link
                      href={result!.page}
                      onClick={onClose}
                      className="mt-3 inline-block rounded-full bg-destiny-orange px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
                    >
                      {result!.ctaLabel}
                    </Link>
                  )}
                </div>
              </>
            )}

            {/* No results */}
            {showEmpty && (
              <p className="px-4 py-6 text-center text-sm text-white/40">
                No results found for &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
