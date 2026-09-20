"use client";

import { useCallback, useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

/**
 * Focus trap + Escape + focus restore for a dialog that isn't built on
 * `components/ui/Modal.tsx`.
 *
 * `Modal.tsx` carries this exact logic, but it also owns the panel's mount
 * lifecycle — it unmounts the instant `open` goes false, with no room for an
 * exit transition. `TextToGiveCTA`'s panel needs to scale and fade out over
 * 350ms before it leaves the DOM, which means it cannot hand its rendering to
 * `Modal.tsx` without losing that. This hook is the trap on its own, for a
 * dialog that has to keep controlling its own markup and timing.
 *
 * Extracted here rather than duplicated a second time — `Modal.tsx` could be
 * rebuilt on this too, but it isn't broken, so that's a separate change.
 */
export function useFocusTrap(
  panelRef: React.RefObject<HTMLElement | null>,
  active: boolean,
  onEscape: () => void,
): void {
  const openerRef = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active) return;

    openerRef.current = document.activeElement as HTMLElement | null;
    const target = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus();

    return () => {
      openerRef.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- panelRef is a ref
  }, [active]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onEscapeRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el.tagName === "IFRAME");
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- panelRef is a ref
    [],
  );

  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, handleKey]);
}
