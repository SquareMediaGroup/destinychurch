"use client";

// The generic dialog shell this codebase has been missing.
//
// There were six one-off modals before this one, and only NfcTileModal had real
// dialog semantics — its own header comment says as much: the other copies have
// "no role, no focus management and no trap". That was defensible when each was
// a bespoke thing; it stops being defensible once a sign-in form is going into
// one, because a login you can Tab out of into the page behind is a login a
// screen-reader user cannot complete.
//
// So the behaviour here is NfcTileModal's (portal, focus trap, Escape, labelled
// dialog, CSS-keyframe entrance) fitted to an API that takes children, the way
// the admin HrUI Modal does. New modals should use this; the existing six can be
// migrated onto it when they're next touched, rather than in one sweep.
//
// Two details worth keeping:
//   - Scroll lock restores the *previous* overflow value, not "". Blanking it
//     breaks any page that set its own (admin/Sheet.tsx got this right; the
//     others didn't).
//   - Focus returns to whatever opened the modal. NfcTileModal left that to its
//     parent, which meant most callers silently dropped it.

import { useCallback, useEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

export type ModalSize = "sm" | "md" | "lg";

const SIZES: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  showClose = true,
  closeOnBackdrop = true,
  className,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  /** Rendered as the dialog's accessible name. */
  title: string;
  /** Optional sub-line under the title. */
  description?: string;
  size?: ModalSize;
  showClose?: boolean;
  /** Off for flows where a stray backdrop click would lose typed input. */
  closeOnBackdrop?: boolean;
  className?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const reactId = useId();
  const titleId = `modal-title-${reactId}`;
  const descId = `modal-desc-${reactId}`;

  // Focus in on open, back to the opener on close, and hold the page still in
  // between.
  useEffect(() => {
    if (!open) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Prefer the close button; fall back to the first focusable thing in the
    // panel for modals rendered without one.
    const target =
      closeRef.current ??
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ??
      panelRef.current;
    target?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      openerRef.current?.focus?.();
    };
  }, [open]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

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
    if (!open) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="dc-modal-backdrop fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className={cn(
          "dc-modal-panel relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl",
          SIZES[size],
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/5 px-6 py-4">
          <div className="min-w-0">
            <p id={titleId} className="font-black text-destiny-grey">
              {title}
            </p>
            {description && (
              <p id={descId} className="mt-0.5 text-sm text-destiny-grey/55">
                {description}
              </p>
            )}
          </div>
          {showClose && (
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-destiny-grey/50 transition hover:bg-black/5 hover:text-destiny-grey focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destiny-orange/40"
            >
              <span className="material-symbols-rounded text-xl">close</span>
            </button>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-black/5 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
}
