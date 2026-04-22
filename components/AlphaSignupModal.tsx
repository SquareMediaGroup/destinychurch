"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  signupUrl: string;
  title: string;
  subtitle?: string;
}

export default function AlphaSignupModal({
  open,
  onClose,
  signupUrl,
  title,
  subtitle,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      setTimeout(() => {
        document.body.style.overflow = "";
      }, 350);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted || !open) return null;

  return createPortal(
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
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
        style={{
          transform: visible ? "scale(1)" : "scale(0.92)",
          opacity: visible ? 1 : 0,
          transition:
            "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
          <div>
            <p className="font-black text-destiny-grey">{title}</p>
            {subtitle && (
              <p className="text-xs text-destiny-grey/50 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey"
            aria-label="Close"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>
        <iframe
          src={signupUrl}
          className="w-full"
          style={{ height: 620, border: "none" }}
          title={title}
          loading="lazy"
        />
      </div>
    </div>,
    document.body
  );
}
