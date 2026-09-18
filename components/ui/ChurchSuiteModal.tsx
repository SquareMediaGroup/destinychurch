"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";
import { useHydrated } from "@/lib/useHydrated";
import { useScrollLock } from "@/lib/useScrollLock";

// Matches NfcTileModal, which is where the dialog semantics below come from.
const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])';

/**
 * The site's one "open a ChurchSuite form in a lightbox" modal.
 *
 * Four components had grown their own copy of this — giving, the connect card,
 * the You Said Yes form, and course signups — identical down to the cubic-bezier
 * on the panel transition, and each carrying the same three faults:
 *
 *  - The Escape listener was bound for the life of the component, not just
 *    while the modal was open. A closed modal still ran its close handler on
 *    every Escape, and that handler cleared `document.body.style.overflow` —
 *    so Escape anywhere on the page could unlock scrolling behind something
 *    else that was legitimately holding it.
 *  - The close timeout and the two rAFs were never cancelled, so unmounting
 *    mid-animation left them to fire against a dead component, and reopening
 *    inside 350ms let the old timer tear down the new modal.
 *  - Closing wrote `overflow = ""` rather than restoring the previous value.
 *
 * None of the four announced itself as a dialog or managed focus either, which
 * NfcTileModal's header note already called out. Those semantics live here now,
 * so every caller gets them: a labelled dialog, focus moved in on open, focus
 * returned to whatever opened it on close, and Tab held inside the panel.
 *
 * The panel below is a separate component so it mounts fresh on each open. That
 * is what makes the entrance animation work with no "reset on close"
 * bookkeeping: `visible` always starts false, and the only write to it is the
 * rAF. The exit transition never ran in any of the originals either — the
 * portal is gone the moment `open` goes false.
 */
export interface ChurchSuiteModalProps {
  open: boolean;
  onClose: () => void;
  /** The ChurchSuite URL to embed. */
  src: string;
  title: string;
  subtitle?: string;
  /**
   * Accessible name for the iframe, when the panel heading is too terse to
   * stand on its own out of context ("You Said Yes!" vs "You Said Yes
   * registration form"). Defaults to `title`.
   */
  embedTitle?: string;
  /**
   * `lg` widens the panel and lets the embed scroll inside it. Plain forms fit
   * the default 620px box; a full ChurchSuite event page (artwork, description,
   * ticket picker, then the form) does not.
   */
  size?: "md" | "lg";
}

export default function ChurchSuiteModal({
  open,
  onClose,
  src,
  title,
  subtitle,
  embedTitle,
  size = "md",
}: ChurchSuiteModalProps) {
  const hydrated = useHydrated();
  // createPortal needs a document.body that only exists after hydration.
  const showing = hydrated && open;

  useScrollLock(showing);

  if (!showing) return null;

  return createPortal(
    <ModalPanel
      onClose={onClose}
      src={src}
      title={title}
      subtitle={subtitle}
      embedTitle={embedTitle ?? title}
      size={size}
    />,
    document.body,
  );
}

function ModalPanel({
  onClose,
  src,
  title,
  subtitle,
  embedTitle,
  size,
}: Omit<ChurchSuiteModalProps, "open"> & { embedTitle: string; size: "md" | "lg" }) {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    // Two frames: one for the browser to paint the scale(0.92) start state, one
    // to flip to the end state so the transition actually runs.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, []);

  // Move focus into the dialog, and hand it back to whatever opened it. This
  // component only exists while the modal is open, so mount and unmount are
  // exactly the right moments for both halves.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      // Trap: the iframe swallows focus once entered, so Shift+Tab off the
      // first element and Tab off the last both wrap within the panel.
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el.tagName === "IFRAME");
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
    [onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{
        background: visible ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(6px)" : "blur(0px)",
        transition: "background 0.35s ease, backdrop-filter 0.35s ease",
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${
          // A definite height, not max-h: the embed fills it, and percentage
          // heights don't resolve against an auto-height parent.
          size === "lg" ? "h-[88vh] max-w-3xl" : "max-w-2xl"
        }`}
        style={{
          transform: visible ? "scale(1)" : "scale(0.92)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 px-6 py-4">
          <div>
            <p id={titleId} className="font-black text-destiny-grey">
              {title}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-subtle">{subtitle}</p>
            )}
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-subtle transition hover:bg-gray-100 hover:text-destiny-grey"
            aria-label="Close"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>
        {size === "lg" ? (
          <div className="min-h-0 flex-1">
            <ChurchSuiteEmbed src={src} title={embedTitle} fill className="h-full" />
          </div>
        ) : (
          <ChurchSuiteEmbed src={src} title={embedTitle} height={620} />
        )}
      </div>
    </div>
  );
}
