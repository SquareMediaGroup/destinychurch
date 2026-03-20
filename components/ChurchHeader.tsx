"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

const aboutDropdown = [
  { href: "/about#vision", label: "Our Vision" },
  { href: "/about#pillars", label: "Foundational Pillars" },
  { href: "/about#beliefs", label: "What We Believe" },
  { href: "/about#team", label: "Team" },
];

const whatsOnDropdown = [
  { href: "/whats-on#events", label: "Events" },
  { href: "/whats-on#courses", label: "Courses" },
  { href: "/whats-on#alpha", label: "Alpha" },
  { href: "/whats-on#missions", label: "Missions" },
  { href: "/whats-on#highlights", label: "Highlights" },
];

const navItems = [
  { label: "What's on", dropdown: whatsOnDropdown },
  { href: "/serve", label: "Serve" },
  { label: "About", dropdown: aboutDropdown },
  { href: "/give", label: "Give" },
];

function Dropdown({
  items,
  open,
  onClose,
}: {
  items: { href: string; label: string }[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2">
      <div className="min-w-[180px] rounded-2xl border border-black/5 bg-white p-2 shadow-xl">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="block rounded-xl px-4 py-2.5 text-sm font-medium text-destiny-grey transition hover:bg-gray-50 hover:text-destiny-orange"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ChurchHeader() {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <header
      ref={headerRef}
      className="absolute left-0 right-0 top-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
        <div className="flex items-center justify-between rounded-full bg-destiny-grey/80 px-6 py-3 backdrop-blur-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-9 w-[170px]">
              <Image
                src="/img/brand/destiny-logo-color-white.svg"
                alt="Destiny Church"
                fill
                priority
                sizes="170px"
                className="object-contain"
              />
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              if (item.dropdown) {
                const isOpen = openDropdown === item.label;
                return (
                  <div key={item.label} className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenDropdown(isOpen ? null : item.label)
                      }
                      className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-white/90 transition hover:text-white"
                    >
                      {item.label}
                      <svg
                        className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <Dropdown
                      items={item.dropdown}
                      open={isOpen}
                      onClose={() => setOpenDropdown(null)}
                    />
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  className="rounded-full px-4 py-2 text-sm font-medium text-white/90 transition hover:text-white"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-3">
            <Link
              href="/new-here"
              className="rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
            >
              New Here?
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
              className="relative h-10 w-10 rounded-full text-white transition md:hidden"
            >
              <span
                className={`absolute left-1/2 top-[30%] block h-0.5 w-5 -translate-x-1/2 bg-current transition ${
                  mobileOpen ? "translate-y-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-1/2 block h-0.5 w-5 -translate-x-1/2 bg-current transition ${
                  mobileOpen ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute left-1/2 bottom-[30%] block h-0.5 w-5 -translate-x-1/2 bg-current transition ${
                  mobileOpen ? "-translate-y-1.5 -rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="mt-2 rounded-2xl bg-white p-4 shadow-xl md:hidden">
            {navItems.map((item) => {
              if (item.dropdown) {
                return (
                  <div key={item.label}>
                    <p className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-destiny-grey/50">
                      {item.label}
                    </p>
                    {item.dropdown.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setMobileOpen(false)}
                        className="block rounded-xl px-3 py-2.5 text-sm font-medium text-destiny-grey transition hover:bg-gray-50 hover:text-destiny-orange"
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href!}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-destiny-grey transition hover:bg-gray-50 hover:text-destiny-orange"
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
