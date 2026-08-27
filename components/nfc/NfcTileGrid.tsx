"use client";

// The tile grid on /nfc. Cards are buttons rather than links: everything opens
// in place, because the point of the page is that someone taps their phone on
// the seat in front of them and is done before the next song starts.

import { useCallback, useRef, useState } from "react";
import NfcTileModal from "@/components/nfc/NfcTileModal";
import type { NfcTile, NfcTileMode } from "@/lib/nfcTiles";
import { trackClick } from "@/lib/track";

/** What the card promises before you tap it. */
const BADGE: Record<NfcTileMode, string> = {
  embed: "Form",
  event: "Sign up",
  info: "Details",
};

export default function NfcTileGrid({ tiles }: { tiles: NfcTile[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  // The card that opened the modal, so focus can go back to it on close.
  const invokerRef = useRef<HTMLButtonElement | null>(null);

  const active = tiles.find((t) => t.id === activeId) ?? null;

  const close = useCallback(() => {
    setActiveId(null);
    invokerRef.current?.focus();
    invokerRef.current = null;
  }, []);

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
        {tiles.map((tile, i) => (
          <li
            key={tile.id}
            className="nfc-reveal"
            style={{ animationDelay: `${0.26 + i * 0.07}s` }}
          >
            <button
              type="button"
              onClick={(e) => {
                invokerRef.current = e.currentTarget;
                trackClick("nfc", tile.id, tile.title);
                setActiveId(tile.id);
              }}
              className="nfc-card group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white p-6 text-left outline-none sm:p-7"
            >
              {/* orange fill on hover / focus */}
              <span aria-hidden className="nfc-fill absolute inset-0 bg-destiny-orange" />

              <div className="relative flex items-start justify-between">
                <span
                  aria-hidden
                  className="material-symbols-rounded nfc-icon text-3xl text-destiny-orange"
                >
                  {tile.icon}
                </span>
                <span className="nfc-badge text-[10px] font-bold uppercase tracking-[0.2em] text-destiny-grey/35">
                  {BADGE[tile.mode]}
                </span>
              </div>

              <div className="relative mt-10 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="nfc-title font-[family-name:var(--font-heading)] text-xl font-black leading-tight text-destiny-grey sm:text-2xl">
                    {tile.title}
                  </h2>
                  {tile.subtitle && (
                    <p className="nfc-blurb mt-1 text-sm text-destiny-grey/55">
                      {tile.subtitle}
                    </p>
                  )}
                </div>
                <span
                  aria-hidden
                  className="material-symbols-rounded nfc-arrow shrink-0 text-3xl text-destiny-grey/40"
                >
                  arrow_forward
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      <NfcTileModal tile={active} onClose={close} />
    </>
  );
}
