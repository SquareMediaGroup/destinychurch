"use client";

// "Welcome to Destiny — what would you like to do?"
//
// Nearly everyone who arrives is trying to do one of five things, and until now
// those five were spread across a hero CTA, the header, two anchors inside
// /whats-on and a footer link group. This puts them in one place, once per
// browser session, on the homepage.
//
// Three things it deliberately does not do:
//
//   Render on the server. It returns null until an effect opens it, so the
//   overlay contributes nothing to the indexed HTML — no metadata, no sitemap
//   entry, no new URLs, and data-nosnippet keeps its copy out of search
//   snippets. Every destination is a route that was already in the sitemap.
//
//   Interrupt someone who arrived with intent. A session that entered on /give
//   never sees it (see decideWelcome in lib/welcomeOverlay.ts), and it waits for
//   the cookie banner to be answered rather than burying it.
//
//   Reuse PopupShell. That shell is a single-CTA promo with no focus management;
//   this is a five-option menu that people navigate by keyboard. The dialog
//   semantics here are lifted from components/nfc/NfcTileModal.tsx, which is the
//   reference implementation in this repo — labelled dialog, focus in on open,
//   focus restored on close, Tab held inside.
//
// The surfaces are the site glass system, and the glass is full-bleed: a fixed,
// viewport-sized sheet with the panel floating on it, rather than a contained
// slab. Three layers, back to front — scrim, glass, content — and that order is
// the point. backdrop-filter samples everything painted below it, and an earlier
// sibling counts, so the glass frosts an already-dimmed page. Tinting the glass
// darker instead, or laying the scrim over the top, would both flatten its sheen
// and cursor bloom. Both layers are fixed rather than absolute so they stay put
// when a short viewport scrolls the panel.
//
// Two things the glass system dictates. The cards carry no bg-* utility, because
// a Tailwind background outranks .glass's own (utilities sort after @layer
// components). And refraction (glass-refract) sits on the cards, not on the
// full-bleed sheet: refracting the entire viewport behind a cursor-tracked
// bloom is the more expensive surface to run every frame, and the visible
// bend reads better on five bounded panels than smeared across the whole
// screen. The sheet keeps the cheaper blur + sheen fallback instead. Mobile
// still drops refraction to plain blur automatically — that's glass-refract's
// own @media (max-width: 768px) rule in globals.css, unaffected by which
// element carries the class.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCookieConsent } from "@/lib/cookieConsent";
import { usePopupGate } from "@/lib/popupGate";
import {
  WELCOME_OPTIONS,
  WELCOME_STORAGE_KEY,
  WELCOME_VERSION,
  decideWelcome,
} from "@/lib/welcomeOverlay";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Long enough for the hero to land first, short enough to still feel like a greeting. */
const OPEN_DELAY_MS = 900;

function markSeen() {
  try {
    window.sessionStorage.setItem(WELCOME_STORAGE_KEY, WELCOME_VERSION);
  } catch {
    /* private mode, storage disabled — the overlay just shows again next load */
  }
}

export default function WelcomeOverlay() {
  const pathname = usePathname();
  const { decided } = useCookieConsent();
  const setWelcomeOpen = usePopupGate((s) => s.setWelcomeOpen);

  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // The first path this session rendered — the deep-link test in decideWelcome.
  const entryRef = useRef<string | null>(null);
  // Whatever had focus before the overlay took it, so close can hand it back.
  const restoreRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (entryRef.current === null) entryRef.current = pathname;

    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(WELCOME_STORAGE_KEY);
    } catch {
      /* ignore */
    }

    const decision = decideWelcome({
      pathname,
      entryPathname: entryRef.current,
      stored,
      consentResolved: decided,
    });

    if (decision === "suppress") {
      // Settle it for the whole session, so a later hop to the homepage doesn't
      // reopen the question for someone who arrived on a deep link.
      markSeen();
      return;
    }
    if (decision === "wait") return;

    const t = window.setTimeout(() => {
      restoreRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setOpen(true);
      setWelcomeOpen(true);
      // Marked on open, not on close: navigating away from an open overlay still
      // counts as having seen it.
      markSeen();
    }, OPEN_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname, decided, setWelcomeOpen]);

  const close = useCallback(() => {
    setOpen(false);
    setWelcomeOpen(false);
    const target = restoreRef.current;
    restoreRef.current = null;
    if (target && document.contains(target)) target.focus();
  }, [setWelcomeOpen]);

  // Releases the gate if this unmounts while open, so the promo popups aren't
  // held off forever.
  useEffect(() => () => setWelcomeOpen(false), [setWelcomeOpen]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [close],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      data-nosnippet
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto p-4"
      onClick={close}
    >
      {/* Two full-bleed layers, in this order on purpose: the scrim dims the
          page, then the glass frosts the already-dimmed result. A scrim laid
          over the glass instead would flatten its sheen and bloom. Both are
          fixed, so they stay put when a short viewport scrolls the panel. */}
      <div aria-hidden className="welcome-scrim fixed inset-0" />
      <div
        aria-hidden
        className="welcome-glass glass glass-xl fixed inset-0"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="nfc-modal-panel relative z-10 my-auto flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 px-6 pt-6 sm:px-8 sm:pt-7">
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close welcome"
            className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white"
          >
            <span aria-hidden className="material-symbols-rounded text-xl">
              close
            </span>
          </button>

          <p className="font-[family-name:var(--font-playfair)] text-lg italic text-white/70 sm:text-xl">
            Glad you&apos;re here
          </p>
          <h2
            id={titleId}
            className="mt-0.5 font-[family-name:var(--font-anton)] text-3xl uppercase leading-[0.95] tracking-tight text-white sm:text-5xl"
          >
            Welcome to Destiny
          </h2>
          <div className="welcome-rule mt-3 h-1 w-16 rounded-full bg-destiny-orange" />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.24em] text-white/60">
            What would you like to do?
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-5 pt-4 sm:px-8 sm:pb-6">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {WELCOME_OPTIONS.map((option, i) => (
              <li
                key={option.href}
                className={`welcome-reveal ${option.featured ? "sm:col-span-2" : ""}`}
                style={{ animationDelay: `${0.1 + i * 0.06}s` }}
              >
                <Link
                  href={option.href}
                  onClick={close}
                  className="welcome-card glass glass-sm glass-refract group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 p-4 outline-none sm:p-5"
                >
                  {/* orange fill on hover / focus */}
                  <span
                    aria-hidden
                    className="welcome-fill absolute inset-0 bg-destiny-orange"
                  />

                  <div className="relative flex items-start justify-between">
                    <span className="welcome-num font-[family-name:var(--font-anton)] text-lg text-destiny-orange">
                      {option.index}
                    </span>
                    <span
                      aria-hidden
                      className="material-symbols-rounded welcome-icon text-2xl text-white/35"
                    >
                      {option.icon}
                    </span>
                  </div>

                  <div className="relative mt-3 flex items-end justify-between gap-2 sm:mt-4">
                    <div className="min-w-0">
                      <h3 className="welcome-title font-[family-name:var(--font-heading)] text-base font-black leading-tight text-white sm:text-lg">
                        {option.title}
                      </h3>
                      <p className="welcome-blurb mt-0.5 text-xs leading-snug text-white/70 sm:text-sm">
                        {option.blurb}
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className="material-symbols-rounded welcome-arrow shrink-0 text-xl text-white/45"
                    >
                      arrow_forward
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* The skip is a real control, not a hidden X — it's the honest answer for
            most people who land here, so it gets a full-width button of its own. */}
        <div className="shrink-0 border-t border-white/10 bg-white/5 px-6 py-3 sm:px-8">
          <button
            type="button"
            onClick={close}
            className="welcome-skip flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-sm font-bold text-white/75 outline-none transition hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-destiny-orange"
          >
            Just browsing, thanks
            <span aria-hidden className="material-symbols-rounded text-base">
              arrow_forward
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
