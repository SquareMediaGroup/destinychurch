"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  variant?: "dark" | "light";
}

export default function GiveCTA({ variant = "dark" }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const openModal = () => {
    setOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setVisible(false);
    setTimeout(() => {
      setOpen(false);
      document.body.style.overflow = "";
    }, 350);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const subtitleClass = variant === "dark" ? "text-white/60" : "text-destiny-grey/50";

  return (
    <>
      <button
        onClick={openModal}
        className="group flex items-center gap-4 rounded-2xl bg-destiny-orange px-7 py-4 text-left shadow-xl shadow-destiny-orange/30 transition hover:brightness-110"
      >
        <span className="material-symbols-rounded text-2xl text-white">volunteer_activism</span>
        <span>
          <span className="block text-sm font-black text-white">Give Online</span>
          <span className={`block text-xs ${subtitleClass}`}>Secure giving via ChurchSuite</span>
        </span>
        <span className="material-symbols-rounded ml-4 text-lg text-white/60 transition group-hover:translate-x-1">arrow_forward</span>
      </button>

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{
            background: visible ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)",
            backdropFilter: visible ? "blur(6px)" : "blur(0px)",
            transition: "background 0.35s ease, backdrop-filter 0.35s ease",
          }}
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            style={{
              transform: visible ? "scale(1)" : "scale(0.92)",
              opacity: visible ? 1 : 0,
              transition: "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-black/5 px-6 py-4">
              <p className="font-black text-destiny-grey">Give Online</p>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey"
                aria-label="Close"
              >
                <span className="material-symbols-rounded text-xl">close</span>
              </button>
            </div>
            <iframe
              src="https://destinytees.churchsuite.com/donate"
              className="w-full"
              style={{ height: 620, border: "none" }}
              title="Give Online — Destiny Church"
              loading="lazy"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
