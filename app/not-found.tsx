"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PLACEHOLDERS = [
  "When does the service start?",
  "Is there Kids Church?",
  "How do I get baptised?",
  "Where do I park?",
  "What is Alpha?",
  "How can I serve?",
  "Where can I find sermons?",
  "How do I join a Connect Group?",
];

const QUICK_LINKS = [
  { label: "New Here", href: "/new-here", icon: "waving_hand" },
  { label: "Visit", href: "/visit", icon: "place" },
  { label: "Sermons", href: "/sermons", icon: "play_circle" },
  { label: "What's On", href: "/whats-on", icon: "calendar_month" },
  { label: "Give", href: "/give", icon: "favorite" },
  { label: "Contact", href: "/contact", icon: "mail" },
];

export default function NotFound() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    setPlaceholderIndex(Math.floor(Math.random() * PLACEHOLDERS.length));
    const t = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (query) return;
    const id = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(id);
  }, [query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <section className="relative isolate flex min-h-[80vh] flex-col items-center justify-center overflow-hidden bg-destiny-grey px-6 py-20 text-white">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute left-1/2 top-1/3 h-[60vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destiny-orange/30 blur-[140px]" />
        <div className="absolute right-[10%] bottom-[15%] h-[35vmin] w-[35vmin] rounded-full bg-destiny-blue/20 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-2xl text-center">
        {/* 404 wordmark */}
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.4em] text-destiny-orange">
          Error 404
        </p>
        <h1 className="font-anton text-5xl leading-none sm:text-7xl md:text-8xl">
          Page Not Found
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/70">
          The page you&rsquo;re looking for has moved, been renamed or never existed. Try Smart Search below — it&rsquo;ll point you the right way.
        </p>

        {/* Smart Search */}
        <form onSubmit={handleSubmit} className="mt-8">
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40">
              <span className="material-symbols-rounded text-xl">
                auto_awesome
              </span>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={PLACEHOLDERS[placeholderIndex]}
              aria-label="Smart Search"
              className="w-full rounded-full border border-white/15 bg-white/5 py-4 pl-12 pr-14 text-sm text-white placeholder:text-white/40 shadow-2xl backdrop-blur-md transition focus:border-destiny-orange/60 focus:bg-white/10 focus:outline-none focus:ring-4 focus:ring-destiny-orange/20 sm:pl-14 sm:pr-32 sm:text-base"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              aria-label="Search"
              className="absolute right-2 top-1/2 inline-flex h-10 -translate-y-1/2 items-center justify-center gap-1.5 rounded-full bg-destiny-orange px-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110 disabled:opacity-40 sm:px-5"
            >
              <span className="hidden sm:inline">Search</span>
              <span className="material-symbols-rounded text-base sm:text-sm">
                arrow_forward
              </span>
            </button>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Ask anything &mdash; service times, sermons, kids, giving, getting involved.
          </p>
        </form>

        {/* Quick links */}
        <div className="mt-10">
          <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-white/40">
            Or jump to
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 backdrop-blur transition hover:border-destiny-orange/40 hover:bg-destiny-orange/10 hover:text-white"
              >
                <span className="material-symbols-rounded text-base text-white/40 transition group-hover:text-destiny-orange">
                  {l.icon}
                </span>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-white/60 transition hover:text-white"
          >
            <span className="material-symbols-rounded text-base">
              arrow_back
            </span>
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
