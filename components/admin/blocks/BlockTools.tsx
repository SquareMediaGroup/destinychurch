"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import { BlockPalette } from "./BlockPalette";
import { BlockInspector } from "./BlockInspector";

/**
 * The compact blocks affordance, for editors that have no room for sidebars.
 *
 * The post editor is a full-screen surface and gets persistent Blocks and
 * Settings panels. The job, training and product editors are modals, so they
 * get the same two surfaces as bottom sheets instead.
 *
 * The separation is the same either way, and it is the point: these buttons sit
 * OUTSIDE the rich-text toolbar. That toolbar formats the current text
 * selection; blocks are page structure. Mixing them makes both harder to find,
 * and would mean touching RichTextEditor's toolbar for every new block.
 */
export function BlockTools({ editor }: { editor: Editor | null }) {
  const [sheet, setSheet] = useState<"blocks" | "settings" | null>(null);

  return (
    <>
      <div className="flex gap-1.5">
        <ToolButton icon="widgets" label="Blocks" onClick={() => setSheet("blocks")} />
        <ToolButton icon="tune" label="Settings" onClick={() => setSheet("settings")} />
      </div>

      {sheet && (
        <BlockSheet
          title={sheet === "blocks" ? "Blocks" : "Block settings"}
          onClose={() => setSheet(null)}
        >
          {sheet === "blocks" ? (
            <BlockPalette
              editor={editor}
              // Straight from picking a block into configuring it. There's no
              // room to show both, and a block left at its defaults isn't a
              // useful place to stop.
              onInserted={() => setSheet("settings")}
            />
          ) : (
            <BlockInspector editor={editor} onClose={() => setSheet(null)} />
          )}
        </BlockSheet>
      )}
    </>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1 text-xs font-bold text-destiny-grey/60 transition hover:bg-[#f5f7fa] hover:text-destiny-grey"
    >
      <span className="material-symbols-rounded text-[15px]">{icon}</span>
      {label}
    </button>
  );
}

export function BlockSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    // z-60 clears the host Modal, which sits at z-50.
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/40">
      <button
        type="button"
        aria-label={`Close ${title}`}
        className="flex-1"
        onClick={onClose}
      />
      <div className="flex max-h-[75vh] flex-col rounded-t-3xl border-t border-black/5 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/8 px-4 py-3">
          <p className="text-sm font-black text-destiny-grey">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-destiny-grey/50 transition hover:bg-[#f5f7fa]"
          >
            <span className="material-symbols-rounded text-xl">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
