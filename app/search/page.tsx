import type { Metadata } from "next";
import Link from "next/link";
import { runSmartSearch } from "@/lib/smartSearch";
import SearchChat from "@/components/SearchChat";

export const dynamic = "force-dynamic";

const SITE_PAGES = [
  { title: "Sermons",      href: "/sermons",       desc: "Watch sermons from Destiny Church" },
  { title: "Give",         href: "/give",           desc: "Support Destiny Church" },
  { title: "Visit",        href: "/visit",          desc: "Plan your first visit" },
  { title: "New Here",     href: "/new-here",       desc: "Everything you need to know" },
  { title: "What's On",    href: "/whats-on",       desc: "Events, courses and more" },
  { title: "Alpha",        href: "/alpha",          desc: "Explore the Christian faith" },
  { title: "Serve",        href: "/serve",          desc: "Join a volunteer team" },
  { title: "About",        href: "/about",          desc: "Our mission, team and vision" },
  { title: "Missions",     href: "/missions",       desc: "Our mission partners" },
  { title: "Contact",      href: "/contact",        desc: "Get in touch" },
  { title: "Youth",        href: "/youth",          desc: "Destiny Youth, ages 11–18" },
  { title: "Young Adults", href: "/young-adults",   desc: "Community for 18–30s" },
  { title: "Kids",         href: "/kids",           desc: "Destiny Kids, ages 0–11" },
  { title: "Safeguarding", href: "/safeguarding",   desc: "Our safeguarding policy" },
  { title: "Beliefs",      href: "/beliefs",        desc: "What we believe" },
  { title: "Connect",      href: "/connect",        desc: "Join a connect group" },
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q} — Destiny Church` : "Search — Destiny Church",
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const pages = query
    ? SITE_PAGES.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  // Shared Smart Search engine — always returns a usable answer (never "no results").
  const result = query ? await runSmartSearch(query) : null;

  return (
    <div className="min-h-screen bg-[#f5f5f5] pt-28 pb-20">
      <div className="mx-auto max-w-2xl px-4 lg:px-6">

        {/* Search bar */}
        <form action="/search" method="GET" className="mb-7">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              name="q"
              type="text"
              defaultValue={query}
              placeholder="Search Anything Destiny…"
              autoFocus
              className="w-full rounded-full border border-gray-200 bg-white py-3.5 pl-12 pr-5 text-gray-800 shadow-sm focus:border-destiny-orange/40 focus:outline-none focus:ring-2 focus:ring-destiny-orange/20"
            />
          </div>
        </form>

        {/* Empty state */}
        {!query && (
          <div className="py-16 text-center">
            <svg className="mx-auto mb-4 h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-gray-400">Enter a search term above to get started.</p>
          </div>
        )}

        {/* AI Overview with chat */}
        {result && (
          <SearchChat
            initialAnswer={result.answer}
            initialPage={result.page}
            initialCtaLabel={result.ctaLabel}
            query={query}
          />
        )}

        {/* Page results */}
        {pages.length > 0 && (
          <div className="mb-5">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Pages</p>
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              {pages.map((page, i) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className={`group flex items-center gap-4 px-5 py-4 transition hover:bg-gray-50 ${
                    i < pages.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400 transition group-hover:bg-destiny-orange/10 group-hover:text-destiny-orange">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-destiny-orange transition">{page.title}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">
                      destinytees.uk{page.href}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
