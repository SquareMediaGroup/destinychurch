"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";

interface Props {
  open: boolean;
  onClose: () => void;
  signupUrl: string;
  title: string;
  subtitle?: string;
  /**
   * `lg` widens the panel and lets the embed scroll inside it. Course signup
   * forms fit the default 620px box; a full ChurchSuite event page (artwork,
   * description, ticket picker, then the form) does not.
   */
  size?: "md" | "lg";
}

export default function AlphaSignupModal({
  open,
  onClose,
  signupUrl,
  title,
  subtitle,
  size = "md",
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
        {size === "lg" ? (
          <div className="min-h-0 flex-1">
            <ChurchSuiteEmbed src={signupUrl} title={title} fill className="h-full" />
          </div>
        ) : (
          <ChurchSuiteEmbed src={signupUrl} title={title} height={620} />
        )}
      </div>
    </div>,
    document.body
  );
}
