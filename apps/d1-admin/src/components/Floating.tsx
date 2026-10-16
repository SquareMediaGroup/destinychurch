// A panel that opens at a point (a right-click, or a button's corner), stays
// inside the window, and closes on Escape, an outside click, scrolling or the
// window losing focus. The context menu and the emoji picker are both this.

import { useLayoutEffect, useEffect, useRef, useState, type ReactNode } from "react";

export interface Point {
  x: number;
  y: number;
}

const MARGIN = 8;

export function Floating({ at, label, onClose, children, width }: { at: Point; label: string; onClose: () => void; children: ReactNode; width?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Point>(at);

  // Measure after the first paint of the content, then pull it back inside the window.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    setPos({
      x: Math.max(MARGIN, Math.min(at.x, window.innerWidth - w - MARGIN)),
      y: Math.max(MARGIN, Math.min(at.y, window.innerHeight - h - MARGIN)),
    });
  }, [at.x, at.y]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("mousedown", onDown, true);
    window.addEventListener("blur", onClose);
    window.addEventListener("resize", onClose);
    // Scrolling the page closes it; scrolling inside it (the emoji grid) must not.
    const onScroll = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("mousedown", onDown, true);
      window.removeEventListener("blur", onClose);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width,
        zIndex: 30,
        borderRadius: 12,
        background: "var(--sheet)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.24), 0 0 0 0.5px var(--glass-line)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}
