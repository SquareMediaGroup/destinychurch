"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface PopupData {
  active: boolean;
  title: string | null;
  body: string | null;
  cta_text: string | null;
  cta_link: string | null;
  image_url: string | null;
  show_once: boolean;
  updated_at?: string | null;
}

const STORAGE_KEY = "dc-popup-dismissed";

export default function SitePopup({ popup }: { popup: PopupData | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!popup || !popup.active) return;
    const hasContent =
      !!popup.title || !!popup.body || !!popup.image_url;
    if (!hasContent) return;

    if (popup.show_once) {
      try {
        const dismissed = window.localStorage.getItem(STORAGE_KEY);
        if (dismissed && dismissed === (popup.updated_at ?? "")) return;
      } catch {
        /* ignore */
      }
    }

    const t = window.setTimeout(() => setOpen(true), 600);
    return () => window.clearTimeout(t);
  }, [popup]);

  function close() {
    setOpen(false);
    if (popup?.show_once) {
      try {
        window.localStorage.setItem(STORAGE_KEY, popup.updated_at ?? "1");
      } catch {
        /* ignore */
      }
    }
  }

  if (!popup || !popup.active || !open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm animate-in fade-in"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
        >
          <span className="material-symbols-rounded text-lg">close</span>
        </button>

        {popup.image_url && (
          <div className="relative aspect-[16/9] w-full bg-[#f5f7fa]">
            <Image
              src={popup.image_url}
              alt={popup.title ?? ""}
              fill
              sizes="(max-width: 768px) 100vw, 28rem"
              className="object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-3 p-6">
          {popup.title && (
            <h2 className="text-2xl font-black text-destiny-grey">
              {popup.title}
            </h2>
          )}
          {popup.body && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-destiny-grey/70">
              {popup.body}
            </p>
          )}
          {popup.cta_text && popup.cta_link && (
            <Link
              href={popup.cta_link}
              onClick={close}
              className="mt-3 inline-flex w-fit items-center gap-2 rounded-xl bg-destiny-orange px-5 py-3 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
            >
              {popup.cta_text}
              <span className="material-symbols-rounded text-base">
                arrow_forward
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
