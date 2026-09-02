"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { useIsClient } from "@/lib/useIsClient";
import { BlockPalette } from "./BlockPalette";

/**
 * The desktop counterpart to the blocks bottom sheet.
 *
 * A mouse can drag, so on desktop the palette is worth keeping open while you
 * work rather than dismissing itself on every insert — a right-hand drawer
 * that stays put until you close it, the same shape the post editor's
 * persistent Blocks sidebar already uses (`BlockPalette layout="sidebar"`,
 * which is where the drag handling lives). This just wraps that in an
 * overlay for the editors that are a scrolling page rather than a
 * fixed-viewport document surface, so it doesn't require reshaping their
 * layout into a permanent side-by-side split.
 */
export function BlockDrawer({
  editor,
  onClose,
}: {
  editor: Editor | null;
  onClose: () => void;
}) {
  const isClient = useIsClient();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  if (!isClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 cursor-default bg-black/20"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add a block"
        className="relative flex h-full w-80 shrink-0 flex-col border-l border-black/8 bg-white shadow-2xl dark:border-white/8 dark:bg-destiny-grey-800"
      >
        {/*
          No header of its own: BlockPalette's `sidebar` layout already renders
          the "Blocks" title, the drag/click hint and the search field — the
          same header the post editor's persistent sidebar uses. Duplicating it
          here would just repeat it. The close button rides on top of that
          layout instead of replacing it.
        */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-destiny-grey/50 dark:text-white/50 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:hover:text-white"
        >
          <span aria-hidden className="material-symbols-rounded text-xl">close</span>
        </button>

        <div className="min-h-0 flex-1">
          <BlockPalette editor={editor} layout="sidebar" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
