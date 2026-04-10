"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useBanner } from "@/contexts/BannerContext";

const aboutDropdown = [
  { href: "/about", label: "Our Mission" },
  { href: "/about#pillars", label: "Foundational Pillars" },
  { href: "/about#team", label: "Meet the Team" },
  { href: "/beliefs", label: "What We Believe" },
  { href: "/visit", label: "Plan a Visit" },
];

const whatsOnDropdown = [
  { href: "/whats-on", label: "Events" },
  { href: "/whats-on", label: "Courses" },
  { href: "/alpha", label: "Alpha" },
  { href: "/missions", label: "Missions" },
  { href: "/whats-on", label: "Highlights" },
];

const navItems = [
  { label: "What's on", href: "/whats-on", dropdown: whatsOnDropdown },
  { href: "/sermons", label: "Sermons" },
  { href: "/serve", label: "Serve" },
  { label: "About", href: "/about", dropdown: aboutDropdown },
  { href: "/hire", label: "Hire" },
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
            key={item.label}
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
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    setScrolled(y > 50);
    if (y > lastScrollY.current && y > 80) {
      setHidden(true);
      setOpenDropdown(null);
    } else {
      setHidden(false);
    }
    lastScrollY.current = y;
  }, []);

  useEffect(() => {
    setMounted(true);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 80) setHidden(false);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  if (pathname.startsWith("/sermons")) return null;

  const isAdmin = pathname.startsWith("/admin");
  const banner = useBanner();
  const bannerOffset = banner.active && !isAdmin ? "top-10" : "top-0";

  return (
    <header
      ref={headerRef}
      className={`fixed left-0 right-0 z-50 ${bannerOffset}`}
      style={{
        transform: !mounted || hidden ? "translateY(-110%)" : "translateY(0)",
        transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
        <div
          className={`flex items-center justify-between rounded-full border px-6 py-3 backdrop-blur-md transition-all duration-300 ${
            scrolled
              ? "border-white/10 bg-destiny-grey/60 shadow-xl shadow-black/30"
              : "border-white/10 bg-destiny-grey/40 shadow-lg shadow-black/10"
          }`}
        >
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
            {!isAdmin && navItems.map((item) => {
              if (item.dropdown) {
                const isOpen = openDropdown === item.label;
                return (
                  <div key={item.label} className="relative flex items-center">
                    <Link
                      href={item.href!}
                      className="rounded-full pl-4 py-2 pr-1 text-sm font-medium text-white/90 transition hover:text-destiny-orange"
                    >
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(isOpen ? null : item.label)}
                      className="rounded-full px-1.5 py-2 text-white/90 transition hover:text-destiny-orange"
                      aria-label={`Toggle ${item.label} menu`}
                    >
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
                  className="rounded-full px-4 py-2 text-sm font-medium text-white/90 transition hover:text-destiny-orange"
                >
                  {item.label}
                </Link>
              );
            })}

            {isAdmin && (
              <>
                <span className="mx-1 h-4 w-px bg-white/20" />
                <span className="rounded-full bg-destiny-orange/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                  Admin
                </span>
                {[
                  { href: "/admin/redirects", label: "Redirects" },
                  { href: "/admin/sermons", label: "Sermons" },
                  { href: "/admin/banner", label: "Banner" },
                  { href: "/admin/pages", label: "Pages" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      pathname.startsWith(item.href)
                        ? "text-destiny-orange"
                        : "text-white/90 hover:text-destiny-orange"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                <form action="/api/admin/logout" method="POST">
                  <button
                    type="submit"
                    className="rounded-full px-4 py-2 text-sm font-medium text-white/50 transition hover:text-white/90"
                  >
                    Sign out
                  </button>
                </form>
              </>
            )}
          </nav>

          {/* CTA + mobile toggle */}
          <div className="flex items-center gap-3">
            {isAdmin ? (
              <Link
                href="/"
                className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/80 transition hover:border-white/40 hover:text-white"
              >
                ← View Site
              </Link>
            ) : (
              <Link
                href="/new-here"
                className="whitespace-nowrap rounded-full bg-destiny-orange px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
              >
                New Here?
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label="Toggle navigation"
              className="relative h-10 w-10 rounded-full text-white transition md:hidden"
            >
              {/* Hamburger — fades out when open */}
              <span className={`absolute inset-0 flex flex-col items-center justify-center gap-[5px] transition-opacity duration-200 ${mobileOpen ? "opacity-0" : "opacity-100"}`}>
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
              {/* X — fades in when open */}
              <span className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${mobileOpen ? "opacity-100" : "opacity-0"}`}>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
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
