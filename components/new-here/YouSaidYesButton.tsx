"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";

export default function YouSaidYesButton() {
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

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex w-fit items-center rounded-full border border-destiny-grey/30 px-5 py-2 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
      >
        Register your interest
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
              <p className="font-black text-destiny-grey">You Said Yes!</p>
              <button
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey"
                aria-label="Close"
              >
                <span className="material-symbols-rounded text-xl">close</span>
              </button>
            </div>
            <ChurchSuiteEmbed
              src="https://destinytees.churchsuite.com/-/forms/uwqnm8of"
              title="You Said Yes registration form"
              height={620}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
