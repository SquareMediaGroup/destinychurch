"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useIsClient } from "@/lib/useIsClient";
import { useKeyboardInset } from "@/lib/useKeyboardInset";

/**
 * The admin bottom sheet.
 *
 * Phones do not have room for a sidebar, so every panel the desktop editors show
 * permanently — the block palette, block settings, page settings — arrives as a
 * sheet instead. This is the same shape iOS, Android, WordPress and every other
 * mobile editor settled on, and the mechanics people expect from it are the
 * point of this component rather than the rounded corners:
 *
 *   - a grabber, so it reads as draggable before you touch it;
 *   - drag down to dismiss, drag up to expand — no aiming at a close button;
 *   - detents, so a half-height sheet leaves the thing you are editing visible
 *     and updating behind it;
 *   - it lifts above the on-screen keyboard instead of hiding behind it;
 *   - it respects the home-indicator inset.
 *
 * Escape is captured rather than bubbled: these sheets open on top of admin
 * modals that close on Escape too, and without the capture-phase listener one
 * key press dismissed both.
 */
export type SheetDetent = "auto" | "half" | "full";

/** Percentage of the available height each detent occupies. */
const DETENT_HEIGHT: Record<SheetDetent, string | undefined> = {
  auto: undefined,
  half: "58%",
  full: "94%",
};

/** Past this, a downward drag is a dismiss rather than a wobble. */
const DISMISS_PX = 110;
/** Past this, an upward drag means "show me more". */
const EXPAND_PX = 44;

export function Sheet({
  title,
  subtitle,
  detent: initialDetent = "full",
  onClose,
  footer,
  children,
}: {
  title: string;
  subtitle?: string;
  /**
   * `half` leaves the canvas visible above the sheet — use it whenever edits
   * inside the sheet change something on the page behind it. `auto` sizes to
   * its content, for short action lists.
   */
  detent?: SheetDetent;
  onClose: () => void;
  /** Pinned below the scroll area, above the home-indicator inset. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [detent, setDetent] = useState<SheetDetent>(initialDetent);
  // An `auto` sheet is sized to a short action list; letting a drag stretch it
  // to full height would be a gesture with a surprising result. It still
  // dismisses on a downward drag.
  const resizable = initialDetent !== "auto";
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const keyboard = useKeyboardInset();

  // Portals need the DOM, and this component is server-rendered as part of its
  // parent tree, so the first render has to produce nothing.
  const isClient = useIsClient();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Capture phase + stopPropagation: the host Modal also listens on
      // document, and it is registered first, so nothing in the bubble phase can
      // stop it. Closing the sheet must not also close the editor behind it.
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function onPointerDown(event: React.PointerEvent) {
    // Let the close button in the header be a button.
    if ((event.target as HTMLElement).closest("button")) return;
    startY.current = event.clientY;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent) {
    if (startY.current === null) return;
    // Rubber-banding upward: the sheet can't grow past its full detent, so an
    // upward drag only hints that letting go will expand it.
    const dy = event.clientY - startY.current;
    setDragY(resizable ? Math.max(dy, -60) : Math.max(dy, 0));
  }

  function onPointerUp() {
    if (startY.current === null) return;
    startY.current = null;
    setDragging(false);
    const travelled = dragY;
    setDragY(0);

    if (travelled > DISMISS_PX) {
      // A full sheet steps down to half first — the same two-stage dismissal
      // iOS uses, so an over-eager swipe doesn't throw away the panel.
      if (resizable && detent === "full") setDetent("half");
      else onClose();
    } else if (resizable && travelled < -EXPAND_PX) {
      setDetent("full");
    }
  }

  if (!isClient) return null;

  return createPortal(
    <div
      // Anchored to the top so the keyboard inset can shorten it from below,
      // which shortens the sheet with it rather than pushing it off-screen.
      //
      // z-110 sits above every surface a sheet can open on top of — the admin
      // modals (z-50) and the dev block sandbox (z-100) — and below
      // DialogProvider (z-200), so the editor's link prompt still opens over a
      // sheet rather than underneath it.
      className="fixed inset-x-0 top-0 z-[110] flex flex-col justify-end"
      style={{ bottom: keyboard }}
    >
      <button
        type="button"
        aria-label={`Close ${title}`}
        onClick={onClose}
        className={`min-h-6 flex-1 cursor-default transition-colors duration-200 ${
          detent === "full" ? "bg-black/40" : "bg-black/20"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex min-h-0 w-full flex-col overflow-hidden rounded-t-3xl border-t border-black/5 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl lg:mx-auto lg:max-w-2xl"
        style={{
          height: DETENT_HEIGHT[detent],
          maxHeight: detent === "auto" ? "84%" : undefined,
          transform: dragY === 0 ? undefined : `translateY(${dragY}px)`,
          transition: dragging
            ? "none"
            : "transform 260ms cubic-bezier(0.16,1,0.3,1), height 260ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          // touch-none: without it the browser claims the gesture for scrolling
          // and the drag never reaches these handlers.
          className="shrink-0 touch-none select-none"
        >
          <div className="flex cursor-grab justify-center pb-1 pt-2.5 active:cursor-grabbing">
            <span aria-hidden className="h-1.5 w-10 rounded-full bg-black/15" />
          </div>
          <div className="flex items-center gap-2 border-b border-black/8 px-4 pb-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-destiny-grey">{title}</p>
              {subtitle && (
                <p className="truncate text-xs text-destiny-grey/45">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-destiny-grey/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
            >
              <span className="material-symbols-rounded text-xl">close</span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-black/8 bg-white px-4 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
