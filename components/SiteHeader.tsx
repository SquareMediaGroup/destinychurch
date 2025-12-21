"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import CTAButton from "./CTAButton";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";
import logoColor from "@/Logos/Destiny Church Full Logo Colour.svg";
import logoWhite from "@/Logos/Destiny Church Full Logo Color and White.svg";

const navLinks = [
  { href: "/sermons/series", label: "Series" },
  { href: "/sermons/guests", label: "Guests" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!pathname.startsWith("/sermons")) {
      setQuery("");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
  }, [pathname]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/sermons?q=${encodeURIComponent(trimmed)}` : "/sermons");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--surface-overlay)]/80 text-[var(--foreground)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Destiny Church home">
          <div className="relative h-10 w-[190px]">
            <Image
              src={logoColor}
              alt="Destiny Church"
              fill
              priority
              sizes="190px"
              className="object-contain logo-color"
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              onContextMenu={(event) => event.preventDefault()}
            />
            <Image
              src={logoWhite}
              alt="Destiny Church"
              fill
              priority
              sizes="190px"
              className="object-contain logo-white"
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              onContextMenu={(event) => event.preventDefault()}
            />
          </div>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-4 text-sm font-semibold text-destiny-grey md:flex">
          <CTAButton href="/sermons" className="px-4 py-2 text-xs">
            Sermons
          </CTAButton>
          {navLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors hover:text-destiny-orange ${
                  isActive ? "text-destiny-orange" : ""
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <form
            onSubmit={handleSearch}
            className="hidden items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2 text-xs shadow-sm md:flex"
          >
            <Icon name="search" size={16} className="text-destiny-grey/70" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search sermons..."
              aria-label="Search sermons..."
              enterKeyHint="search"
              className="w-32 bg-transparent text-[13px] text-[var(--foreground)] placeholder:text-destiny-grey/80 focus:outline-none lg:w-40"
            />
          </form>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-expanded={open}
            aria-label="Toggle navigation"
            className="relative h-11 w-11 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm transition hover:border-destiny-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destiny-orange md:hidden"
          >
            <span
              className={`absolute left-1/2 top-[30%] block h-0.5 w-5 -translate-x-1/2 bg-current transition ${
                open ? "translate-y-1.5 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-1/2 block h-0.5 w-5 -translate-x-1/2 bg-current transition ${
                open ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute left-1/2 bottom-[30%] block h-0.5 w-5 -translate-x-1/2 bg-current transition ${
                open ? "-translate-y-1.5 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {open && (
        <div className="mx-auto w-full max-w-7xl px-4 pb-6 md:hidden">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-5 shadow-lg">
            <div className="grid gap-3">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href));
                return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold transition hover:bg-[var(--surface-muted)] ${
                  isActive ? "text-destiny-orange" : "text-[var(--foreground)]"
                }`}
              >
                    <span>{link.label}</span>
                    <span aria-hidden className="text-xs text-destiny-orange">
                      →
                    </span>
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 grid gap-3">
              <CTAButton
                href="/sermons"
                className="w-full text-center"
                onClick={() => setOpen(false)}
              >
                Sermons
              </CTAButton>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
