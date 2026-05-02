"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";

interface Props {
  variant?: "dark" | "light";
}

export default function GiveCTA({ variant = "dark" }: Props) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [modalMode, setModalMode] = useState<"online" | "custom">("online");

  useEffect(() => { setMounted(true); }, []);

  const openModal = (mode: "online" | "custom") => {
    setModalMode(mode);
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
      <div className="flex flex-col gap-3 sm:flex-row">
        {/* Primary CTA: Text to Give £10 */}
        <button
          onClick={() => openModal("online")}
          className="group flex items-center gap-4 rounded-2xl bg-destiny-orange px-7 py-4 text-left shadow-xl shadow-destiny-orange/30 transition hover:brightness-110"
        >
          <span className="material-symbols-rounded text-2xl text-white">sms</span>
          <span>
            <span className="block text-sm font-black text-white">Text to Give £10</span>
            <span className={`block text-xs ${subtitleClass}`}>Send DCTEES give 10</span>
          </span>
          <span className="material-symbols-rounded ml-4 text-lg text-white/60 transition group-hover:translate-x-1">arrow_forward</span>
        </button>

        {/* Secondary CTA: Custom Amount */}
        <button
          onClick={() => openModal("custom")}
          className="group flex items-center gap-4 rounded-2xl bg-white/20 px-7 py-4 text-left transition hover:bg-white/30"
        >
          <span className="material-symbols-rounded text-2xl text-white">edit</span>
          <span>
            <span className="block text-sm font-black text-white">Other Amount</span>
            <span className={`block text-xs ${subtitleClass}`}>Online, bank or custom text</span>
          </span>
          <span className="material-symbols-rounded ml-4 text-lg text-white/60 transition group-hover:translate-x-1">arrow_forward</span>
        </button>
      </div>

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
              <p className="font-black text-destiny-grey">
                {modalMode === "online" ? "Give Online" : "Give a Custom Amount"}
              </p>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey"
                aria-label="Close"
              >
                <span className="material-symbols-rounded text-xl">close</span>
              </button>
            </div>

            {modalMode === "online" ? (
              <ChurchSuiteEmbed
                src="https://destinytees.churchsuite.com/donate"
                title="Give Online — Destiny Church"
                height={620}
              />
            ) : (
              <div className="p-8">
                <p className="mb-6 text-sm text-destiny-grey/60">
                  Choose your preferred giving method below:
                </p>
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      window.open("https://destinytees.churchsuite.com/donate", "_blank");
                      closeModal();
                    }}
                    className="w-full rounded-2xl bg-destiny-orange/10 px-4 py-3 text-left transition hover:bg-destiny-orange/20"
                  >
                    <p className="font-bold text-destiny-grey">Give Online</p>
                    <p className="text-sm text-destiny-grey/60">Any amount via secure payment</p>
                  </button>
                  <button
                    onClick={() => {
                      const message = "I'd like to give a custom amount via text. Text DCTEES give [amount] to 07380 307 800";
                      window.location.href = `sms:?body=${encodeURIComponent(message)}`;
                      closeModal();
                    }}
                    className="w-full rounded-2xl bg-destiny-orange/10 px-4 py-3 text-left transition hover:bg-destiny-orange/20"
                  >
                    <p className="font-bold text-destiny-grey">Text to Give</p>
                    <p className="text-sm text-destiny-grey/60">Text DCTEES give [amount] to 07380 307 800</p>
                  </button>
                  <button
                    onClick={() => {
                      closeModal();
                      document.getElementById("give-bank")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="w-full rounded-2xl bg-destiny-orange/10 px-4 py-3 text-left transition hover:bg-destiny-orange/20"
                  >
                    <p className="font-bold text-destiny-grey">Bank Transfer</p>
                    <p className="text-sm text-destiny-grey/60">Direct bank transfer or standing order</p>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
