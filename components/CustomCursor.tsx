"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const el = cursorRef.current;
    if (!el) return;

    const move = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };

    const onOver = (e: MouseEvent) => {
      const target = e.target as Element;
      if (target.closest("a, button, [role='button'], [tabindex]")) {
        setHovered(true);
      }
    };

    const onOut = (e: MouseEvent) => {
      const target = e.relatedTarget as Element | null;
      if (!target?.closest("a, button, [role='button'], [tabindex]")) {
        setHovered(false);
      }
    };

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mouseout", onOut, { passive: true });

    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: hovered ? 32 : 16,
        height: hovered ? 32 : 16,
        borderRadius: "50%",
        backgroundColor: "#f58021",
        pointerEvents: "none",
        zIndex: 99999,
        translate: "-50% -50%",
        willChange: "transform",
        transition: "width 0.2s ease, height 0.2s ease, opacity 0.2s ease",
        opacity: 1,
      }}
    />
  );
}
