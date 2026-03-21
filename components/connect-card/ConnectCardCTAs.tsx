"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type ModalType = "connect" | "prayer" | null;

const FORMS: Record<NonNullable<ModalType>, { src: string; title: string }> = {
  connect: {
    src: "https://destinytees.churchsuite.com/forms/kw3c1oly",
    title: "eConnectCard",
  },
  prayer: {
    src: "https://destinytees.churchsuite.com/forms/1yctuibm",
    title: "Prayer Request",
  },
};

interface Props {
  variant?: "dark" | "light";
}

export default function ConnectCardCTAs({ variant = "dark" }: Props) {
  const [open, setOpen] = useState<ModalType>(null);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const openModal = (type: NonNullable<ModalType>) => {
    setOpen(type);
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    document.body.style.overflow = "hidden";
  };

  const closeModal = () => {
    setVisible(false);
    setTimeout(() => {
      setOpen(null);
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
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        {/* eConnectCard */}
        <button
          onClick={() => openModal("connect")}
          className="group flex items-center gap-4 rounded-2xl bg-destiny-orange px-7 py-4 text-left shadow-xl shadow-destiny-orange/30 transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-2xl text-white">person_add</span>
          <span>
            <span className="block text-sm font-black text-white">Fill in a Connect Card</span>
            <span className={`block text-xs ${subtitleClass}`}>Let us know who you are</span>
          </span>
          <span className="material-symbols-rounded ml-4 text-lg text-white/60 transition group-hover:translate-x-1">arrow_forward</span>
        </button>

        {/* Prayer Request */}
        <button
          onClick={() => openModal("prayer")}
          className="group flex items-center gap-4 rounded-2xl border-2 border-white/25 px-7 py-4 text-left transition hover:border-destiny-orange"
        >
          <span className="material-symbols-rounded text-2xl text-destiny-orange">volunteer_activism</span>
          <span>
            <span className="block text-sm font-black text-white">Submit a Prayer Request</span>
            <span className={`block text-xs ${subtitleClass}`}>We&apos;d love to pray with you</span>
          </span>
          <span className="material-symbols-rounded ml-4 text-lg text-white/40 transition group-hover:translate-x-1 group-hover:text-destiny-orange">arrow_forward</span>
        </button>
      </div>

      {/* Modal — portalled to body to escape any stacking context */}
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
              <p className="font-black text-destiny-grey">{FORMS[open].title}</p>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey"
                aria-label="Close"
              >
                <span className="material-symbols-rounded text-xl">close</span>
              </button>
            </div>
            <iframe
              src={FORMS[open].src}
              className="w-full"
              style={{ height: 620, border: "none" }}
              title={FORMS[open].title}
              loading="lazy"
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
