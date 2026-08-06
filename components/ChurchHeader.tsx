"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useBannerBars } from "@/lib/useBannerBars";
import CartButton from "@/components/shop/CartButton";

const aboutDropdown = [
  { href: "/about", label: "Our Mission" },
  { href: "/about#pillars", label: "Foundational Pillars" },
  { href: "/about#team", label: "Meet the Team" },
  { href: "/beliefs", label: "What We Believe" },
  { href: "/visit", label: "Plan a Visit" },
  { href: "/jobs", label: "Jobs & Internships" },
  { href: "/governance", label: "Governance" },
];

const whatsOnDropdownBase = [
  { href: "/whats-on#events", label: "Events" },
  { href: "/whats-on#courses", label: "Courses" },
  { href: "/missions", label: "Missions" },
  { href: "/whats-on#highlights", label: "Highlights" },
];

const mobileNavItemsBase = [
  { href: "/whats-on",   label: "What's On"  },
  { href: "/sermons",    label: "Sermons"    },
  { href: "/serve",      label: "Serve"      },
  { href: "/shop",       label: "Shop"       },
  { href: "/about",      label: "About"      },
  { href: "/give",       label: "Give"       },
];

function Dropdown({
  items,
  open,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: {
  items: { href: string; label: string }[];
  open: boolean;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <div
      className="absolute left-1/2 top-full z-50 mt-2"
      style={{
        opacity: open ? 1 : 0,
        transform: open
          ? "translateX(-50%) translateY(0) scale(1)"
          : "translateX(-50%) translateY(-10px) scale(0.9)",
        transformOrigin: "top center",
        pointerEvents: open ? "auto" : "none",
        transition: open
          ? "opacity 0.25s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)"
          : "opacity 0.5s ease, transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="glass glass-strong glass-refract min-w-[180px] rounded-2xl p-2"
      >
        {items.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onClose}
            className="glass-menu-legible block rounded-xl px-4 py-2.5 text-sm font-medium text-white/90 transition-colors duration-200 hover:bg-white/10 hover:text-destiny-orange"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(-8px)",
              transition: `opacity 0.3s ease ${open ? i * 0.04 + 0.06 : 0}s, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) ${open ? i * 0.04 + 0.06 : 0}s`,
            }}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

const MORPH_DISTANCE = 180;

export default function ChurchHeader() {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [alphaActive, setAlphaActive] = useState(false);
  const [youtubeQuotaExceeded, setYoutubeQuotaExceeded] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafId = useRef<number | null>(null);

  const handleNavMouseEnter = (label: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setOpenDropdown(label);
  };

  const handleNavMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => setOpenDropdown(null), 50);
  };

  const handleScroll = useCallback(() => {
    if (rafId.current != null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const y = window.scrollY;
      setMobileOpen(false);
      setScrolled(y > 50);
      setProgress(Math.min(1, Math.max(0, y / MORPH_DISTANCE)));
      if (y > MORPH_DISTANCE && y > lastScrollY.current) {
        setHidden(true);
        setOpenDropdown(null);
      } else {
        setHidden(false);
      }
      lastScrollY.current = y;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [handleScroll]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (e.clientY < 80) setHidden(false);
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/alpha-events")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (cancelled) return;
        const hasActive = Array.isArray(data)
          && data.some((e: { type?: string; active?: boolean }) => e.type === "alpha" && e.active);
        setAlphaActive(hasActive);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/youtube/status")
      .then((res) => (res.ok ? res.json() : { quotaExceeded: false }))
      .then((data: { quotaExceeded?: boolean }) => {
        if (cancelled) return;
        setYoutubeQuotaExceeded(data.quotaExceeded === true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const whatsOnDropdown = useMemo(
    () =>
      alphaActive
        ? [
            whatsOnDropdownBase[0],
            whatsOnDropdownBase[1],
            { href: "/alpha", label: "Alpha" },
            ...whatsOnDropdownBase.slice(2),
          ]
        : whatsOnDropdownBase,
    [alphaActive]
  );

  const navItems = useMemo(
    () => [
      { label: "What's on", href: "/whats-on", dropdown: whatsOnDropdown },
      ...(!youtubeQuotaExceeded ? [{ href: "/sermons", label: "Sermons" }] : []),
      ...(alphaActive ? [{ href: "/alpha", label: "Alpha" }] : []),
      { href: "/serve", label: "Serve" },
      { href: "/shop", label: "Shop" },
      { label: "About", href: "/about", dropdown: aboutDropdown },
      { href: "/give", label: "Give" },
    ],
    [alphaActive, whatsOnDropdown, youtubeQuotaExceeded]
  );

  const mobileNavItems = useMemo(() => {
    const items = mobileNavItemsBase.filter(
      (item) => !(youtubeQuotaExceeded && item.href === "/sermons")
    );
    if (!alphaActive) return items;
    // Insert Alpha after What's On (index 0)
    return [items[0], { href: "/alpha", label: "Alpha" }, ...items.slice(1)];
  }, [alphaActive, youtubeQuotaExceeded]);

  // Hooks must run before any early return (Rules of Hooks).
  const bannerBars = useBannerBars();

  // /nfc is the in-service NFC landing page: standalone, no site nav.
  if (pathname.startsWith("/admin") || pathname.startsWith("/nfc")) return null;

  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";

  return (
    <>
      <header
        ref={headerRef}
        className={`${isHome ? "fixed left-0 right-0" : "sticky"} z-50`}
        style={{
          top: bannerBars * 40,
          transform: !mounted || hidden ? "translateY(-110%)" : "translateY(0)",
          transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "visible",
        }}
      >
        <div
          className="mx-auto"
          style={{
            maxWidth: `min(100%, calc(100% + (80rem - 100%) * ${progress}))`,
            paddingTop: `${progress}rem`,
            paddingBottom: `${progress}rem`,
            paddingLeft: `${progress}rem`,
            paddingRight: `${progress}rem`,
          }}
        >
          {/* Pill + mobile menu wrapper — relative so the menu can hang off it
              as an absolutely-positioned dropdown. Keeping the menu out of flow
              means opening it never grows the (sticky) header on inner pages,
              which previously shifted layout and fired a scroll event that the
              scroll handler used to instantly close the menu again. */}
          <div className="relative">
          {/* Pill */}
          <div
            className="glass glass-refract flex items-center justify-between px-4 py-2 md:px-6"
            style={{
              borderRadius: `${48 * progress}px`,
              backgroundColor: `rgba(54, 63, 72, ${(isHome ? 0.6 : 1) - (isHome ? 0.2 : 0.6) * progress})`,
              transition: "box-shadow 0.3s, border-color 0.3s",
            }}
          >
            {/* Logo — responsive size */}
            <Link href="/" className="flex items-center gap-3">
              <div className="relative h-8 w-[152px] lg:h-[43px] lg:w-[204px]">
                <Image
                  src="/img/brand/destiny-logo-color-white.svg"
                  alt="Destiny Church"
                  fill
                  priority
                  sizes="(min-width: 1024px) 204px, 152px"
                  className="object-contain"
                />
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-1 md:flex">
              {!isAdmin &&
                navItems.map((item) => {
                  if (item.dropdown) {
                    const isOpen = openDropdown === item.label;
                    return (
                      <div
                        key={item.label}
                        className="relative flex items-center"
                        onMouseEnter={() => handleNavMouseEnter(item.label)}
                        onMouseLeave={handleNavMouseLeave}
                      >
                        <Link
                          href={item.href!}
                          className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-white/90 transition hover:text-destiny-orange lg:px-4"
                        >
                          {item.label}
                        </Link>
                        <Dropdown
                          items={item.dropdown}
                          open={isOpen}
                          onClose={() => setOpenDropdown(null)}
                          onMouseEnter={() => handleNavMouseEnter(item.label)}
                          onMouseLeave={handleNavMouseLeave}
                        />
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.href}
                      href={item.href!}
                      className="whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium text-white/90 transition hover:text-destiny-orange lg:px-4"
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
                    { href: "/admin/banner", label: "Banner" },
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

            {/* Right: CTA + mobile toggle */}
            <div className="flex items-center gap-2">
              {!isAdmin && <CartButton />}
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
                  className="hidden whitespace-nowrap rounded-full bg-destiny-orange px-4 py-2 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110 sm:inline-flex md:px-5 md:py-2.5"
                >
                  New Here?
                </Link>
              )}

              <button
                type="button"
                onClick={() => { setMobileOpen(!mobileOpen); }}
                aria-expanded={mobileOpen}
                aria-label="Toggle navigation"
                className="relative h-9 w-9 rounded-full text-white md:hidden"
              >
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-[5px]">
                  <span className={`block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${mobileOpen ? "translate-y-[7px] rotate-45" : ""}`} />
                  <span className={`block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
                  <span className={`block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${mobileOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
                </span>
              </button>
            </div>
          </div>

          {/* Mobile menu — absolute overlay (anchored under the pill) so it
              sits on top of the page instead of expanding the header in flow.
              On non-home pages the header is `sticky`, so in-flow expansion
              shifted the document and triggered handleScroll → setMobileOpen(false),
              which closed the menu the moment it opened. */}
          <div
            className="absolute inset-x-0 top-full z-50 overflow-hidden transition-all duration-300 ease-in-out md:hidden"
            style={{
              maxHeight: mobileOpen ? "600px" : "0px",
              opacity: mobileOpen ? 1 : 0,
            }}
          >
            <div
              className="glass glass-strong glass-refract mt-2 rounded-2xl p-3"
            >
              {/* Flat nav links */}
              {mobileNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-xl px-3 py-2.5 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-destiny-orange"
                >
                  {item.label}
                </Link>
              ))}

              {/* New Here CTA at bottom */}
              <div className="mt-2 border-t border-white/10 pt-2">
                <Link
                  href="/new-here"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center justify-center rounded-xl bg-destiny-orange px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                >
                  New Here?
                </Link>
              </div>
            </div>
          </div>
          </div>
        </div>
      </header>
    </>
  );
}
