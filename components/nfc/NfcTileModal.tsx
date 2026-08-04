"use client";

// The popup behind every tile on /nfc.
//
// Structurally this is AlphaSignupModal — portal to body, backdrop blur, scale-in
// on a double-rAF so the transition has a frame to start from — with two additions:
//
//   Two modes. `embed` frames a ChurchSuite form (Connect Card, Giving) and hangs
//   the "more details" link off the bottom, so the popup answers the question and
//   the page behind it stays available. `info` shows artwork + copy + a CTA, for
//   Alpha and the custom promos an admin adds.
//
//   Real dialog semantics. The four existing copies of this modal (ConnectCardCTAs,
//   GiveCTA, YouSaidYesButton, AlphaSignupModal) have no role, no focus management
//   and no trap. /nfc is the one page used cold by people who have never been here,
//   so it gets the full treatment: labelled dialog, focus in on open, focus back to
//   the invoking card on close, Tab held inside.
//
// The enter animation is CSS (.nfc-modal-* in globals.css) rather than the
// visible-state-plus-double-rAF the other four use: closing here unmounts
// immediately, so the only transition that ever ran was the entrance, and a
// keyframe does that without a render pass.

import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";
import type { NfcTile } from "@/lib/nfcTiles";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, iframe, [tabindex]:not([tabindex="-1"])';

export default function NfcTileModal({
  tile,
  onClose,
}: {
  /** The open tile, or null when nothing is open. */
  tile: NfcTile | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const open = Boolean(tile);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      // Trap: the iframe swallows focus once entered, so Shift+Tab off the
      // first element and Tab off the last both wrap within the panel.
      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((el) => el.offsetParent !== null || el.tagName === "IFRAME");
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  // `tile` is only ever set by a click, so there is no server render to guard
  // against — but the portal still needs a document to attach to.
  if (!tile || typeof document === "undefined") return null;

  const isEmbed = tile.mode === "embed" && Boolean(tile.embedUrl);
  const large = isEmbed && tile.embedSize === "lg";
  const external = Boolean(tile.ctaLink && /^https?:\/\//i.test(tile.ctaLink));
  const titleId = `nfc-modal-title-${tile.id}`;

  const cta =
    tile.ctaText && tile.ctaLink ? (
      external ? (
        <a
          href={tile.ctaLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm font-bold text-destiny-orange transition hover:gap-3"
        >
          {tile.ctaText}
          <span className="material-symbols-rounded text-base">arrow_forward</span>
        </a>
      ) : (
        <Link
          href={tile.ctaLink}
          onClick={onClose}
          className="inline-flex items-center gap-2 text-sm font-bold text-destiny-orange transition hover:gap-3"
        >
          {tile.ctaText}
          <span className="material-symbols-rounded text-base">arrow_forward</span>
        </Link>
      )
    ) : null;

  return createPortal(
    <div
      className="nfc-modal-backdrop fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`nfc-modal-panel relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ${
          // A definite height, not max-h: the embed fills it, and percentage
          // heights don't resolve against an auto-height parent.
          large ? "h-[88vh] max-w-3xl" : "max-w-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-black/5 px-6 py-4">
          <div className="min-w-0">
            <p id={titleId} className="truncate font-black text-destiny-grey">
              {tile.title}
            </p>
            {tile.subtitle && (
              <p className="mt-0.5 truncate text-xs text-destiny-grey/50">
                {tile.subtitle}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-destiny-grey/40 transition hover:bg-gray-100 hover:text-destiny-grey"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        {isEmbed ? (
          <>
            {large ? (
              <div className="min-h-0 flex-1">
                <ChurchSuiteEmbed
                  src={tile.embedUrl!}
                  title={tile.title}
                  fill
                  className="h-full"
                />
              </div>
            ) : (
              <ChurchSuiteEmbed
                src={tile.embedUrl!}
                title={tile.title}
                height={620}
              />
            )}
            {cta && (
              <div className="shrink-0 border-t border-black/5 bg-[#f5f7fa] px-6 py-3.5">
                {cta}
              </div>
            )}
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {tile.imageUrl && (
              <div className="relative aspect-[16/9] w-full bg-[#f5f7fa]">
                <Image
                  src={tile.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 42rem"
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex flex-col items-start gap-5 p-6 sm:p-8">
              {tile.body && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-destiny-grey/70">
                  {tile.body}
                </p>
              )}
              {tile.ctaText && tile.ctaLink && (
                <>
                  {external ? (
                    <a
                      href={tile.ctaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 rounded-2xl bg-destiny-orange px-7 py-4 text-sm font-bold text-white shadow-xl shadow-destiny-orange/30 transition hover:brightness-110"
                    >
                      {tile.ctaText}
                      <span className="material-symbols-rounded text-lg">
                        arrow_forward
                      </span>
                    </a>
                  ) : (
                    <Link
                      href={tile.ctaLink}
                      onClick={onClose}
                      className="inline-flex items-center gap-2 rounded-2xl bg-destiny-orange px-7 py-4 text-sm font-bold text-white shadow-xl shadow-destiny-orange/30 transition hover:brightness-110"
                    >
                      {tile.ctaText}
                      <span className="material-symbols-rounded text-lg">
                        arrow_forward
                      </span>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
