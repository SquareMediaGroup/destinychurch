"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
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

type Row =
  | { kind: "page";   title: string; href: string }
  | { kind: "sermon"; title: string; href: string; ai?: boolean };

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function highlight(text: string, q: string) {
  const needle = q.trim();
  if (!needle) return text;
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i === -1) return text;
  return (
    <>
      {text.slice(0, i)}
      <span className="bg-destiny-orange/25 text-[#2c1a0e] px-[2px] -mx-[2px] rounded-[2px]">
        {text.slice(i, i + needle.length)}
      </span>
      {text.slice(i + needle.length)}
    </>
  );
}

export default function GlobalSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { decided, allowAll, denyOptional } = useCookieConsent();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResult(null);
      setLoading(false);
      setActiveIdx(0);
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
    setActiveIdx(0);
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

  const pageMatches = useMemo(
    () =>
      query.trim().length >= 1
        ? SITE_PAGES.filter((p) =>
            p.title.toLowerCase().includes(query.trim().toLowerCase())
          ).slice(0, 3)
        : [],
    [query]
  );

  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    pageMatches.forEach((p) => out.push({ kind: "page", title: p.title, href: p.href }));
    (result?.sermons ?? []).forEach((s) =>
      out.push({ kind: "sermon", title: s.title, href: `/sermons/${s.id}` })
    );
    (result?.aiSermons ?? []).forEach((s) =>
      out.push({ kind: "sermon", title: s.title, href: `/sermons/${s.id}`, ai: true })
    );
    return out;
  }, [pageMatches, result]);

  function submitFullSearch() {
    if (!query.trim()) return;
    onClose();
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[activeIdx];
      if (row) {
        onClose();
        router.push(row.href);
      } else {
        submitFullSearch();
      }
    }
  }

  if (!open) return null;

  // ─── Cookie consent gate ────────────────────────────────────────────────────
  if (!decided) {
    return (
      <div className="flex justify-center px-4 pt-3 pb-4 lg:px-8">
        <div className="w-full md:max-w-[560px] gs-row-in">
          <div
            className="relative overflow-hidden bg-[#fbf6ec] text-[#2c1a0e]"
            style={{
              borderRadius: 4,
              boxShadow: "0 18px 60px -20px rgba(44,26,14,0.35), 0 2px 0 rgba(44,26,14,0.06)",
            }}
          >
            <div className="h-[3px] w-full bg-destiny-orange origin-left gs-rule" />
            <div className="px-7 pt-6 pb-7">
              <div className="gs-mono mb-4 flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-[#2c1a0e]/45">
                <span>§ 000 — Notice</span>
                <span>destiny.search</span>
              </div>
              <p
                className="text-[22px] leading-[1.15] tracking-tight text-[#2c1a0e]"
                style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif', fontWeight: 900 }}
              >
                Smart Search runs on AI.
                <br />
                <span className="text-[#2c1a0e]/55">Accept cookies to switch it on.</span>
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-[#2c1a0e]/65">
                We use cookies to send your question to the model and remember your consent.
                Nothing more.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <button
                  onClick={allowAll}
                  className="gs-mono inline-flex items-center gap-2 bg-[#2c1a0e] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#fbf6ec] transition hover:bg-destiny-orange"
                  style={{ borderRadius: 2 }}
                >
                  Accept all
                  <span aria-hidden>→</span>
                </button>
                <button
                  onClick={denyOptional}
                  className="gs-mono inline-flex items-center px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2c1a0e]/70 transition hover:text-[#2c1a0e]"
                  style={{ borderRadius: 2 }}
                >
                  Essential only
                </button>
                <button
                  onClick={onClose}
                  className="gs-mono ml-auto px-2 py-2.5 text-[11px] uppercase tracking-[0.18em] text-[#2c1a0e]/35 transition hover:text-[#2c1a0e]/70"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main search ────────────────────────────────────────────────────────────
  const hasAnswer = Boolean(result?.answer);
  const hasRows   = rows.length > 0;
  const showEmpty =
    query.trim().length > 2 && !loading && !hasRows && !hasAnswer;
  const showPanel = hasRows || hasAnswer || showEmpty || loading;

  let rowCounter = 0;

  return (
    <div className="flex justify-center px-4 pt-3 pb-4 lg:px-8">
      <div className="w-full md:max-w-[640px] gs-row-in">
        <div
          className="relative overflow-hidden bg-[#fbf6ec] text-[#2c1a0e]"
          style={{
            borderRadius: 4,
            boxShadow: "0 18px 60px -20px rgba(44,26,14,0.35), 0 2px 0 rgba(44,26,14,0.06)",
          }}
        >
          {/* Top accent rule */}
          <div className="h-[3px] w-full bg-destiny-orange origin-left gs-rule" />

          {/* Header / input */}
          <div className="px-7 pt-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitFullSearch();
              }}
              className="relative"
            >
              <div className="flex items-baseline gap-3 border-b-2 border-[#2c1a0e]/15 pb-3 transition-colors focus-within:border-destiny-orange">
                <span
                  className="gs-mono shrink-0 text-[12px] font-semibold uppercase tracking-[0.18em] text-destiny-orange"
                  aria-hidden
                >
                  Ask
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="What time is the Sunday service?"
                  aria-label="Search Destiny Church"
                  className="w-full bg-transparent text-[20px] leading-snug text-[#2c1a0e] placeholder:text-[#2c1a0e]/30 focus:outline-none"
                  style={{ fontFamily: 'Arial, "Helvetica Neue", sans-serif', fontWeight: 700 }}
                />
                {loading ? (
                  <span
                    className="gs-mono shrink-0 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#2c1a0e]/40"
                    aria-live="polite"
                  >
                    thinking
                    <span className="gs-dot" style={{ animationDelay: "0s"   }}>.</span>
                    <span className="gs-dot" style={{ animationDelay: "0.15s"}}>.</span>
                    <span className="gs-dot" style={{ animationDelay: "0.3s" }}>.</span>
                  </span>
                ) : query ? (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setResult(null);
                      inputRef.current?.focus();
                    }}
                    className="gs-mono shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2c1a0e]/40 transition hover:text-destiny-orange"
                    aria-label="Clear search"
                  >
                    clear ✕
                  </button>
                ) : (
                  <span className="gs-caret shrink-0 text-[20px] font-bold leading-none text-destiny-orange" aria-hidden>
                    ▍
                  </span>
                )}
              </div>
            </form>
          </div>

          {/* Results */}
          {showPanel && (
            <div className="mt-3">
              {/* Loading skeleton */}
              {loading && !hasAnswer && !hasRows && (
                <div className="px-7 py-5">
                  <div className="gs-mono mb-3 text-[10px] uppercase tracking-[0.22em] text-[#2c1a0e]/30">
                    Reading the room
                  </div>
                  <div className="space-y-2">
                    <div className="h-[10px] w-1/3 bg-[#2c1a0e]/10" />
                    <div className="h-[10px] w-4/5 bg-[#2c1a0e]/10" />
                    <div className="h-[10px] w-2/3 bg-[#2c1a0e]/10" />
                  </div>
                </div>
              )}

              {/* PAGES */}
              {pageMatches.length > 0 && (
                <Section label="Pages" count={pageMatches.length}>
                  {pageMatches.map((p) => {
                    const idx = rowCounter++;
                    const active = idx === activeIdx;
                    return (
                      <ResultRow
                        key={p.href}
                        href={p.href}
                        index={idx}
                        active={active}
                        onClose={onClose}
                      >
                        <div className="flex flex-col">
                          <span className="text-[15px] font-bold leading-tight text-[#2c1a0e]">
                            {highlight(p.title, query)}
                          </span>
                          <span className="gs-mono text-[10px] uppercase tracking-[0.18em] text-[#2c1a0e]/35">
                            destinytees.uk{p.href}
                          </span>
                        </div>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {/* SERMONS */}
              {(result?.sermons?.length ?? 0) > 0 && (
                <Section label="Sermons" count={result!.sermons.length}>
                  {result!.sermons.map((s) => {
                    const idx = rowCounter++;
                    const active = idx === activeIdx;
                    return (
                      <ResultRow
                        key={s.id}
                        href={`/sermons/${s.id}`}
                        index={idx}
                        active={active}
                        onClose={onClose}
                      >
                        <div className="flex items-center gap-2">
                          <PlayMark />
                          <span className="text-[15px] font-bold leading-tight text-[#2c1a0e]">
                            {highlight(s.title, query)}
                          </span>
                        </div>
                      </ResultRow>
                    );
                  })}
                </Section>
              )}

              {/* AI OVERVIEW */}
              {hasAnswer && (
                <div className="mt-1 border-t border-[#2c1a0e]/10 px-7 pb-5 pt-5">
                  <div className="relative pl-4">
                    {/* Left rule */}
                    <span className="absolute left-0 top-1 bottom-1 w-[2px] bg-destiny-orange" aria-hidden />
                    <div className="gs-mono mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-destiny-orange">
                      <span>AI Note</span>
                      <span className="text-[#2c1a0e]/30">— a brief, in our own words</span>
                    </div>
                    <p className="text-[14px] leading-[1.65] text-[#2c1a0e]/85">
                      {result!.answer}
                    </p>

                    {/* AI-suggested sermons */}
                    {(result?.aiSermons?.length ?? 0) > 0 && (
                      <div className="mt-4">
                        <div className="gs-mono mb-1.5 text-[10px] uppercase tracking-[0.22em] text-[#2c1a0e]/40">
                          Listen next
                        </div>
                        <ul className="space-y-1">
                          {result!.aiSermons.map((s) => {
                            const idx = rowCounter++;
                            const active = idx === activeIdx;
                            return (
                              <li key={s.id} className="gs-row-in">
                                <Link
                                  href={`/sermons/${s.id}`}
                                  onClick={onClose}
                                  className={`group flex items-center gap-2 py-1 text-[13px] transition ${
                                    active
                                      ? "text-destiny-orange"
                                      : "text-[#2c1a0e]/75 hover:text-destiny-orange"
                                  }`}
                                >
                                  <span className="gs-mono text-[10px] tabular-nums text-[#2c1a0e]/35">
                                    {pad(idx + 1)}
                                  </span>
                                  <PlayMark small />
                                  <span className="truncate font-semibold">{s.title}</span>
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}

                    {/* CTA */}
                    {result!.page && result!.ctaLabel && (result?.aiSermons?.length ?? 0) === 0 && (
                      <Link
                        href={result!.page}
                        onClick={onClose}
                        className="gs-mono mt-4 inline-flex items-center gap-2 bg-[#2c1a0e] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#fbf6ec] transition hover:bg-destiny-orange"
                        style={{ borderRadius: 2 }}
                      >
                        {result!.ctaLabel}
                        <span aria-hidden>→</span>
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {/* No results */}
              {showEmpty && (
                <div className="px-7 py-8 text-center">
                  <div className="gs-mono mb-2 text-[10px] uppercase tracking-[0.22em] text-[#2c1a0e]/30">
                    Nothing on file
                  </div>
                  <p className="text-[15px] text-[#2c1a0e]/55">
                    We couldn&rsquo;t find <span className="italic text-[#2c1a0e]">&ldquo;{query}&rdquo;</span>.
                    <br />
                    Try a different phrasing — or{" "}
                    <button
                      onClick={submitFullSearch}
                      className="font-semibold text-destiny-orange underline-offset-2 hover:underline"
                    >
                      ask us directly
                    </button>
                    .
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer keyboard hints */}
          {showPanel && (
            <div className="gs-mono flex items-center justify-between border-t border-[#2c1a0e]/10 bg-[#f3ecdc]/60 px-7 py-2.5 text-[10px] uppercase tracking-[0.18em] text-[#2c1a0e]/45">
              <div className="flex items-center gap-3">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
                <span>navigate</span>
                <span className="text-[#2c1a0e]/20">·</span>
                <Kbd>↵</Kbd>
                <span>open</span>
              </div>
              <button
                onClick={submitFullSearch}
                disabled={!query.trim()}
                className="inline-flex items-center gap-1.5 transition hover:text-destiny-orange disabled:opacity-30 disabled:hover:text-[#2c1a0e]/45"
              >
                See full results
                <span aria-hidden>→</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#2c1a0e]/10 first:border-t-0">
      <div className="gs-mono flex items-baseline justify-between px-7 pt-3 pb-1 text-[10px] uppercase tracking-[0.22em] text-[#2c1a0e]/45">
        <span>{label}</span>
        <span className="tabular-nums text-[#2c1a0e]/30">{pad(count)}</span>
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function ResultRow({
  href,
  index,
  active,
  onClose,
  children,
}: {
  href: string;
  index: number;
  active: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <li className="gs-row-in">
      <Link
        href={href}
        onClick={onClose}
        className={`group relative flex items-center gap-4 px-7 py-2.5 transition-colors ${
          active ? "bg-destiny-orange/10" : "hover:bg-destiny-orange/5"
        }`}
      >
        {/* Left active marker */}
        <span
          className={`absolute left-0 top-2 bottom-2 w-[3px] origin-top transition-transform duration-200 ${
            active ? "scale-y-100 bg-destiny-orange" : "scale-y-0 bg-destiny-orange/40 group-hover:scale-y-100"
          }`}
          aria-hidden
        />
        <span className="gs-mono w-6 shrink-0 text-[10px] tabular-nums text-[#2c1a0e]/35">
          {pad(index + 1)}
        </span>
        <div className="min-w-0 flex-1">{children}</div>
        <span
          className={`shrink-0 text-[#2c1a0e]/30 transition-all ${
            active ? "translate-x-0 text-destiny-orange" : "-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
          }`}
          aria-hidden
        >
          →
        </span>
      </Link>
    </li>
  );
}

function PlayMark({ small = false }: { small?: boolean }) {
  const size = small ? 10 : 12;
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center text-destiny-orange"
      style={{ width: size + 6, height: size + 6 }}
      aria-hidden
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M6 4l14 8-14 8V4z" />
      </svg>
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="gs-mono inline-flex h-[18px] min-w-[18px] items-center justify-center bg-[#2c1a0e]/8 px-1 text-[10px] font-semibold text-[#2c1a0e]/70"
      style={{ borderRadius: 2, boxShadow: "inset 0 -1px 0 rgba(44,26,14,0.12)" }}
    >
      {children}
    </kbd>
  );
}
