"use client";

// Shared chrome for the site's modal popups.
//
// Extracted from SitePopup so the generic site popup and the event popup can't
// drift visually. The *behaviour* around it differs and stays with each caller:
// both dismiss via sessionStorage (once per browser session, reset when
// edited), EventPopup additionally has a path exclusion.

import Image from "next/image";
import Link from "next/link";

export default function PopupShell({
  title,
  body,
  imageUrl,
  ctaText,
  ctaLink,
  onClose,
}: {
  title?: string | null;
  body?: string | null;
  imageUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  onClose: () => void;
}) {
  const external = Boolean(ctaLink && /^https?:\/\//i.test(ctaLink));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Announcement"}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
        >
          <span className="material-symbols-rounded text-lg">close</span>
        </button>

        {imageUrl && (
          <div className="relative aspect-[16/9] w-full bg-[#f5f7fa]">
            <Image
              src={imageUrl}
              alt={title ?? ""}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 28rem"
              className="object-cover"
            />
          </div>
        )}

        <div className="flex flex-col gap-3 p-6">
          {title && (
            <h2 className="text-2xl font-black text-destiny-grey">{title}</h2>
          )}
          {body && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-destiny-grey/70">
              {body}
            </p>
          )}
          {ctaText && ctaLink && (
            external ? (
              <a
                href={ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
                className="mt-3 inline-flex w-fit items-center gap-2 rounded-xl bg-destiny-orange px-5 py-3 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
              >
                {ctaText}
                <span className="material-symbols-rounded text-base">
                  arrow_forward
                </span>
              </a>
            ) : (
              <Link
                href={ctaLink}
                onClick={onClose}
                className="mt-3 inline-flex w-fit items-center gap-2 rounded-xl bg-destiny-orange px-5 py-3 text-sm font-bold text-white shadow-sm shadow-destiny-orange/20 transition hover:brightness-110"
              >
                {ctaText}
                <span className="material-symbols-rounded text-base">
                  arrow_forward
                </span>
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
