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
  { label: "New Here", href: "/new-here" },
  { label: "Visit", href: "/visit" },
  { label: "Sermons", href: "/sermons" },
  { label: "What's On", href: "/whats-on" },
  { label: "Give", href: "/give" },
  { label: "Contact", href: "/contact" },
];

export default function NotFound() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    setPlaceholderIndex(Math.floor(Math.random() * PLACEHOLDERS.length));
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
    <section className="flex min-h-[80vh] flex-col items-center justify-center bg-destiny-grey px-6 py-20 text-white">
      <div className="w-full max-w-2xl text-center">
        <h1
          className="uppercase leading-[0.85] tracking-tight"
          style={{ fontFamily: "var(--font-anton)" }}
        >
          <span className="block text-[16vw] sm:text-[8rem]">404</span>
          <span className="mt-2 block text-[7vw] sm:text-3xl">
            Page Not Found
          </span>
        </h1>

        <form onSubmit={handleSubmit} className="mt-10">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={PLACEHOLDERS[placeholderIndex]}
              aria-label="Search"
              className="w-full rounded-full border border-white/15 bg-white/5 py-3.5 pl-5 pr-14 text-sm text-white placeholder:text-white/40 focus:border-destiny-orange focus:outline-none sm:py-4 sm:pr-32 sm:text-base"
            />
            <button
              type="submit"
              disabled={!query.trim()}
              aria-label="Search"
              className="absolute right-1.5 top-1/2 inline-flex h-10 -translate-y-1/2 items-center justify-center gap-1.5 rounded-full bg-destiny-orange px-3 text-xs font-bold uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-40 sm:px-5 sm:py-3.5"
            >
              <span className="hidden sm:inline">Search</span>
              <span className="material-symbols-rounded text-base sm:text-sm">
                arrow_forward
              </span>
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-destiny-orange px-6 py-3 text-xs font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110 sm:px-8 sm:py-3.5 sm:text-sm"
          >
            Back to Home
          </Link>
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full border-2 border-white/30 px-6 py-3 text-xs font-bold text-white transition hover:border-white hover:bg-white/10 sm:px-8 sm:py-3.5 sm:text-sm"
            >
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
