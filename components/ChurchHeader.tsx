"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useBannerBars } from "@/lib/useBannerBars";
import { useHydrated } from "@/lib/useHydrated";
import CartButton from "@/components/shop/CartButton";
import Button from "@/components/ui/Button";
import { isLinksPagePath } from "@/lib/linkPages/paths";

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
      className="absolute left-1/2 top-full z-50 mt-4"
      style={{
        opacity: open ? 1 : 0,
        transform: open
          ? "translateX(-50%) translateY(0)"
          : "translateX(-50%) translateY(-6px)",
        pointerEvents: open ? "auto" : "none",
        transition: open
          ? "opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
          : "opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="min-w-[190px] rounded-2xl bg-white p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.35),0_2px_8px_rgba(0,0,0,0.15)]">
        {items.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            onClick={onClose}
            className="block rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-150 hover:bg-slate-100 hover:text-destiny-orange"
            style={{
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(-4px)",
              transition: `opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1) ${open ? i * 0.03 + 0.04 : 0}s, transform 0.2s cubic-bezier(0.4, 0, 0.2, 1) ${open ? i * 0.03 + 0.04 : 0}s`,
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
  const [mobileSubmenu, setMobileSubmenu] = useState<string | null>(null);
  // Keeps rendering the last-active submenu's items while sliding back to the
  // top level, so the submenu panel doesn't flash empty mid-transition.
  const [lastSubmenu, setLastSubmenu] = useState<string | null>(null);
  const [prevSubmenu, setPrevSubmenu] = useState<string | null>(mobileSubmenu);
  if (mobileSubmenu !== prevSubmenu) {
    setPrevSubmenu(mobileSubmenu);
    if (mobileSubmenu) setLastSubmenu(mobileSubmenu);
  }
  const [, setScrolled] = useState(false);
  // Drives the header's slide-in on first paint.
  const mounted = useHydrated();
  const [progress, setProgress] = useState(0);
  const [alphaActive, setAlphaActive] = useState(false);
  const [youtubeQuotaExceeded, setYoutubeQuotaExceeded] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
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

  const closeMobileMenu = () => {
    setMobileOpen(false);
    setMobileSubmenu(null);
  };

  /**
   * Is this nav item the page we are on?
   *
   * Nav hrefs carry hash fragments (`/whats-on#events`, `/about#pillars`) that
   * `usePathname()` never returns, so they have to come off before comparing —
   * otherwise nothing ever matches. Exact match only: `/sermons` should not
   * light up while you are reading `/sermons/123`, because "you are here" and
   * "you came from here" are different claims.
   */
  const isCurrent = (href: string) => pathname === href.split("#")[0];

  // Escape closes the menu and puts focus back on the button that opened it.
  // Without the second half, closing leaves focus on a link inside a hidden
  // overlay and the next Tab restarts from the top of the document.
  useEffect(() => {
    if (!mobileOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMobileOpen(false);
      setMobileSubmenu(null);
      mobileToggleRef.current?.focus();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // Move focus into the menu when it opens, so a keyboard user is actually
  // taken there rather than continuing from the toggle into the page behind.
  useEffect(() => {
    if (!mobileOpen) return;
    // After the clip-path reveal starts; focusing an element mid-transition is
    // fine, but it must be after `inert` has been removed on this render.
    const id = requestAnimationFrame(() => {
      mobileMenuRef.current
        ?.querySelector<HTMLElement>("a[href], button:not([disabled])")
        ?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [mobileOpen]);


  const handleScroll = useCallback(() => {
    if (rafId.current != null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const y = window.scrollY;
      setMobileOpen(false);
      setMobileSubmenu(null);
      setScrolled(y > 50);
      setProgress(Math.min(1, Math.max(0, y / MORPH_DISTANCE)));
      lastScrollY.current = y;
    });
  }, []);

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, [handleScroll]);

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


  // Hooks must run before any early return (Rules of Hooks).
  const bannerBars = useBannerBars();

  // /nfc is the in-service NFC landing page: standalone, no site nav.
  // /links and /links/<slug> are the Linktree-style pages: the same idea.
  // /portal is the staff self-service area: its own minimal shell, no site nav.
  // /login is the staff/admin sign-in page: standalone, no site nav.
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/nfc") ||
    isLinksPagePath(pathname) ||
    pathname.startsWith("/portal") ||
    pathname === "/login"
  )
    return null;

  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";

  return (
    <>
      <header
        ref={headerRef}
        className={`${isHome ? "fixed left-0 right-0" : "sticky"} z-50`}
        style={{
          top: bannerBars * 40,
          transform: !mounted ? "translateY(-110%)" : "translateY(0)",
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
            {/* Labelled because a page can have several <nav> landmarks —
                this one, the footer's link groups, and the mobile menu — and
                an unlabelled landmark is announced as just "navigation". */}
            <nav
              aria-label="Main"
              className="hidden items-center gap-1 md:flex"
            >
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
                          aria-current={isCurrent(item.href!) ? "page" : undefined}
                          className={`whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium transition hover:text-destiny-orange lg:px-4 ${
                            isCurrent(item.href!)
                              ? "text-destiny-orange"
                              : "text-white/90"
                          }`}
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
                      aria-current={isCurrent(item.href!) ? "page" : undefined}
                      className={`whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-medium transition hover:text-destiny-orange lg:px-4 ${
                        isCurrent(item.href!)
                          ? "text-destiny-orange"
                          : "text-white/90"
                      }`}
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
                      className="rounded-full px-4 py-2 text-sm font-medium text-on-dark-subtle transition hover:text-white/90"
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
                <span className="hidden md:inline-flex">
                  <Button href="/new-here" size="sm" className="whitespace-nowrap">
                    New Here?
                  </Button>
                </span>
              )}

              <button
                ref={mobileToggleRef}
                type="button"
                onClick={() => {
                  setMobileOpen(!mobileOpen);
                  setMobileSubmenu(null);
                }}
                aria-expanded={mobileOpen}
                aria-controls="mobile-menu"
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
                className="relative z-10 h-9 w-9 rounded-full text-white md:hidden"
              >
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-[5px]">
                  <span className={`block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${mobileOpen ? "translate-y-[7px] rotate-45" : ""}`} />
                  <span className={`block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
                  <span className={`block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${mobileOpen ? "-translate-y-[7px] -rotate-45" : ""}`} />
                </span>
              </button>
            </div>
          </div>
          </div>
        </div>
      </header>

      {/* Mobile menu — full-screen brand-color overlay, sibling of <header>
          so its `fixed` positioning isn't scoped by the header's own
          transform (which would otherwise turn "inset-0" into "cover the
          header's own box" instead of the viewport). */}
      {/* `inert` is what makes "closed" actually mean closed. The overlay stays
          mounted so its clip-path reveal can animate, and it used to rely on
          `pointerEvents: none` alone — which stops clicks but does nothing to
          the tab order, so every link in the closed menu was still reachable by
          keyboard and still announced by a screen reader, on every page.

          `inert` removes the whole subtree from the tab order AND the
          accessibility tree without unmounting it, which is exactly the
          distinction `pointer-events` cannot express. */}
      <div
        id="mobile-menu"
        ref={mobileMenuRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site navigation"
        inert={!mobileOpen}
        className="fixed inset-0 z-40 md:hidden"
        style={{ pointerEvents: mobileOpen ? "auto" : "none" }}
      >
        <div
          className="absolute inset-0 bg-destiny-orange/60 backdrop-blur"
          style={{
            clipPath: mobileOpen ? "inset(0 0 0% 0)" : "inset(0 0 100% 0)",
            transition: "clip-path 0.72s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
        <div
          className="relative flex h-full flex-col items-center justify-center overflow-hidden px-8 pb-16 pt-32"
          style={{
            opacity: mobileOpen ? 1 : 0,
            pointerEvents: mobileOpen ? "auto" : "none",
            transition: "opacity 0.15s ease",
          }}
        >
        {/* Sliding row: top-level panel + submenu panel side by side, both
            always mounted, translated horizontally between the two states so
            navigating into/out of a submenu is a real slide rather than an
            instant swap. The outer wrapper clips to the visible panel width;
            the inner row is twice as wide (one panel each) and translates by
            half its own width — i.e. exactly one panel — to switch views. */}
        <div className="relative w-full max-h-full overflow-y-auto overflow-x-hidden">
        <div
          className="flex"
          style={{
            width: "200%",
            transform: mobileSubmenu ? "translateX(-50%)" : "translateX(0)",
            transition: "transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Top-level panel */}
          <div className="flex w-1/2 shrink-0 flex-col items-center gap-1">
            {navItems.map((item, i) =>
              item.dropdown ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setMobileSubmenu(item.label)}
                  className="py-2.5 text-center text-3xl font-extrabold text-white"
                  style={{
                    opacity: mobileOpen ? 1 : 0,
                    transform: mobileOpen ? "translateY(0)" : "translateY(-8px)",
                    transition: `opacity 0.25s ease ${i * 0.04 + 0.05}s, transform 0.25s ease ${i * 0.04 + 0.05}s`,
                  }}
                >
                  {item.label}
                </button>
              ) : (
                <Link
                  key={item.href}
                  href={item.href!}
                  onClick={closeMobileMenu}
                  className="py-2.5 text-center text-3xl font-extrabold text-white"
                  style={{
                    opacity: mobileOpen ? 1 : 0,
                    transform: mobileOpen ? "translateY(0)" : "translateY(-8px)",
                    transition: `opacity 0.25s ease ${i * 0.04 + 0.05}s, transform 0.25s ease ${i * 0.04 + 0.05}s`,
                  }}
                >
                  {item.label}
                </Link>
              )
            )}

            <div className="mt-8 w-full">
              <Link
                href="/new-here"
                onClick={closeMobileMenu}
                className="mx-auto flex w-fit items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-bold text-destiny-orange-dark transition hover:brightness-95"
              >
                New Here?
              </Link>
            </div>
          </div>

          {/* Submenu panel */}
          <div className="flex w-1/2 shrink-0 flex-col items-center gap-1 px-4">
            <button
              type="button"
              onClick={() => setMobileSubmenu(null)}
              className="mb-5 rounded-full bg-black/10 px-5 py-2 text-sm font-bold text-white"
              style={{
                opacity: mobileSubmenu ? 1 : 0,
                transition: "opacity 0.2s ease",
              }}
              tabIndex={mobileSubmenu ? 0 : -1}
            >
              ← Back
            </button>
            {(lastSubmenu === "What's on" ? whatsOnDropdown : aboutDropdown).map((item, i) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={closeMobileMenu}
                className="py-2.5 text-center text-2xl font-extrabold text-white"
                style={{
                  opacity: mobileSubmenu ? 1 : 0,
                  transform: mobileSubmenu ? "translateY(0)" : "translateY(-8px)",
                  transition: `opacity 0.25s ease ${mobileSubmenu ? i * 0.04 + 0.05 : 0}s, transform 0.25s ease ${mobileSubmenu ? i * 0.04 + 0.05 : 0}s`,
                }}
                tabIndex={mobileSubmenu ? 0 : -1}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
        </div>
        </div>
      </div>
    </>
  );
}
