"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import CTAButton from "./CTAButton";
import ThemeToggle from "./ThemeToggle";
import HeaderAuthButton from "./HeaderAuthButton";
import logoColor from "@/Logos/Destiny Church Full Logo Colour.svg";
import logoWhite from "@/Logos/Destiny Church Full Logo White.svg";

const navLinks = [
  { href: "/new-here", label: "New here?" },
  { href: "/whats-on", label: "What’s on" },
  { href: "/watch", label: "Watch" },
  { href: "/sermons", label: "Sermons" },
  { href: "/connect", label: "Connect" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--surface-overlay)]/80 text-[var(--foreground)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Destiny Church home">
          <div className="relative h-10 w-[190px]">
            <Image
              src={logoColor}
              alt="Destiny Church"
              fill
              priority
              sizes="190px"
              className="object-contain logo-color"
            />
            <Image
              src={logoWhite}
              alt="Destiny Church"
              fill
              priority
              sizes="190px"
              className="object-contain logo-white"
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-destiny-grey md:flex">
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
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/give"
              className="rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
            >
              Give
            </Link>
            <CTAButton href="/new-here">Plan your visit</CTAButton>
          </div>
          <ThemeToggle />
          <HeaderAuthButton />
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
                href="/new-here"
                className="w-full text-center"
                onClick={() => setOpen(false)}
              >
                Plan your visit
              </CTAButton>
              <CTAButton
                href="/give"
                variant="ghost"
                className="w-full text-center"
                onClick={() => setOpen(false)}
              >
                Give online
              </CTAButton>
              <HeaderAuthButton className="w-full text-center" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
