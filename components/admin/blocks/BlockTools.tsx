"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import { BLOCKS } from "@/components/blocks/registry";
import type { AnyBlockDefinition } from "@/components/blocks/types";
import { Sheet } from "@/components/admin/Sheet";
import { useIsClient } from "@/lib/useIsClient";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { useKeyboardInset } from "@/lib/useKeyboardInset";
import { BlockDrawer } from "./BlockDrawer";
import { BlockPalette } from "./BlockPalette";
import { BlockInspector } from "./BlockInspector";
import {
  addParagraphAfter,
  deleteBlockAt,
  duplicateBlockAt,
  moveBlockAt,
} from "./blockCommands";
import { useSelectedBlock } from "./useSelectedBlock";

/**
 * The blocks affordance for every editor that isn't the full-screen post
 * editor — and the whole of the blocks UI on a phone.
 *
 * The post editor gets persistent Blocks and Settings panels built into its
 * own layout. The job, training and product editors are a scrolling page or a
 * modal rather than a fixed document surface, so instead of reshaping each of
 * them into a permanent side-by-side split, Blocks opens as an overlay: a
 * right-hand drawer on desktop (same drag-and-drop palette the post editor's
 * sidebar uses) and a bottom sheet on phones, where there's no room for a
 * drawer and dragging isn't the interaction anyway. Settings stays a sheet on
 * both — it's a short, single-block form, not something worth keeping pinned
 * open.
 *
 * Either way these buttons sit OUTSIDE the rich-text toolbar. That toolbar
 * formats the current text selection; blocks are page structure. Mixing them
 * makes both harder to find, and would mean touching RichTextEditor's toolbar
 * for every new block.
 *
 * ── The mobile model ──────────────────────────────────────────────────────
 *
 * Desktop edits a block by hovering it, reading the chrome bar that appears and
 * clicking a 24px control. None of those three steps exist on a touch screen,
 * which is why blocks were close to unusable there.
 *
 * So mobile uses the model every touch editor converged on instead: tap a block
 * to select it, and a toolbar docks to the bottom of the screen carrying that
 * block's actions at thumb size. Reorder and delete are one tap from anywhere on
 * the page; settings open in a half-height sheet so the block stays visible
 * above it and updates as you type. It is a different interaction from desktop
 * on purpose — the desktop one is not a smaller version of anything, it is a
 * mouse-shaped one.
 */
export function BlockTools({ editor }: { editor: Editor | null }) {
  const [sheet, setSheet] = useState<"blocks" | "settings" | "more" | null>(null);
  const selected = useSelectedBlock(editor);
  const def = selected ? BLOCKS[selected.blockName] : undefined;
  const keyboard = useKeyboardInset();
  const isClient = useIsClient();

  /** Run a command on the selected block, then dismiss any open action sheet. */
  function act(run: (editor: Editor, pos: number) => void) {
    if (!editor || !selected) return;
    run(editor, selected.pos);
    setSheet(null);
  }

  const summary = def && selected ? summarise(def, selected.propsJson) : "";
  const isDesktop = useIsDesktop();

  return (
    <>
      <div className="flex gap-1.5">
        <ToolButton icon="widgets" label="Blocks" onClick={() => setSheet("blocks")} />
        <ToolButton icon="tune" label="Settings" onClick={() => setSheet("settings")} />
      </div>

      {/*
        The selected-block toolbar. Portalled to the body because these editors
        are modals whose backdrop uses backdrop-filter, which makes it a
        containing block for `fixed` descendants — the bar would anchor to the
        modal rather than to the screen.

        Hidden while a sheet is open (the sheet owns the screen) and above `lg`,
        where hovering the block is the better interaction and this would just
        be a bar covering the page.
      */}
      {isClient &&
        selected &&
        def &&
        !sheet &&
        createPortal(
          <div
            className="fixed inset-x-0 z-[105] lg:hidden"
            style={{ bottom: keyboard }}
          >
            <div className="mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center gap-1 rounded-2xl border border-black/8 bg-white/95 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur dark:border-white/8 dark:bg-destiny-grey-800/95">
              <BarButton
                icon="keyboard_arrow_up"
                label="Move block up"
                disabled={!selected.canMoveUp}
                onClick={() => act((instance, pos) => moveBlockAt(instance, pos, -1))}
              />
              <BarButton
                icon="keyboard_arrow_down"
                label="Move block down"
                disabled={!selected.canMoveDown}
                onClick={() => act((instance, pos) => moveBlockAt(instance, pos, 1))}
              />

              <button
                type="button"
                onClick={() => setSheet("settings")}
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded-xl px-2 py-2 text-left"
              >
                <span
                  aria-hidden
                  className="material-symbols-rounded shrink-0 text-[18px] text-destiny-orange"
                >
                  {def.icon}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-bold text-destiny-grey dark:text-white">
                  {summary}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSheet("settings")}
                className="flex h-11 shrink-0 items-center gap-1 rounded-xl bg-destiny-orange px-3 text-sm font-bold text-white"
              >
                <span aria-hidden className="material-symbols-rounded text-[18px]">tune</span>
                Edit
              </button>
              <BarButton
                icon="more_horiz"
                label="More block actions"
                onClick={() => setSheet("more")}
              />
            </div>
          </div>,
          document.body,
        )}

      {sheet === "blocks" && isDesktop && (
        // A mouse can drag, so desktop gets the sidebar palette (drag-and-drop
        // included) in a right-hand drawer instead of the phone's bottom
        // sheet — same component the post editor's persistent Blocks sidebar
        // uses. It stays open after an insert, since dragging in several
        // blocks in a row is the point.
        <BlockDrawer editor={editor} onClose={() => setSheet(null)} />
      )}

      {sheet === "blocks" && !isDesktop && (
        <Sheet
          title="Add a block"
          subtitle="Tap a block to drop it into the page."
          onClose={() => setSheet(null)}
        >
          <BlockPalette
            editor={editor}
            layout="sheet"
            // Straight from picking a block into configuring it. There's no
            // room to show both, and a block left at its defaults isn't a
            // useful place to stop.
            onInserted={() => setSheet("settings")}
          />
        </Sheet>
      )}

      {sheet === "settings" && (
        <Sheet
          title={def ? def.label : "Block settings"}
          subtitle={def ? summary : undefined}
          // Half height so the block being edited stays on screen and visibly
          // updates. That live feedback is most of what makes the settings
          // legible at all on a small screen.
          detent="half"
          onClose={() => setSheet(null)}
        >
          {/* No onClose: the sheet owns the header, and its own close button. */}
          <BlockInspector editor={editor} layout="sheet" />
        </Sheet>
      )}

      {sheet === "more" && def && (
        <Sheet title={def.label} detent="auto" onClose={() => setSheet(null)}>
          <div className="flex flex-col gap-1 px-3 py-3">
            <ActionRow
              icon="content_copy"
              label="Duplicate block"
              onClick={() => act(duplicateBlockAt)}
            />
            <ActionRow
              icon="add"
              label="Add a paragraph below"
              onClick={() => act(addParagraphAfter)}
            />
            <ActionRow
              icon="delete"
              label="Delete block"
              destructive
              onClick={() => act(deleteBlockAt)}
            />
          </div>
        </Sheet>
      )}
    </>
  );
}

/** The block's chrome label, e.g. "FAQ · 4 questions". */
function summarise(def: AnyBlockDefinition, propsJson: string): string {
  try {
    return def.summary?.(JSON.parse(propsJson)) ?? def.label;
  } catch {
    return def.label;
  }
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
      // min-h-10 on touch: the old 26px pill was under half the 44px a thumb
      // needs, and it was the entry point to the entire blocks feature.
      className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-black/10 px-3 text-xs font-bold text-destiny-grey/60 dark:text-white/60 transition hover:bg-[#f5f7fa] hover:text-destiny-grey dark:hover:text-white lg:min-h-8 lg:rounded-lg lg:px-2.5"
    >
      <span aria-hidden className="material-symbols-rounded text-[15px]">{icon}</span>
      {label}
    </button>
  );
}

function BarButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: string;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      // Keep focus in the editor so the node selection — and therefore this
      // whole toolbar — survives the tap.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-destiny-grey/60 dark:text-white/60 transition active:bg-black/5 disabled:opacity-25"
    >
      <span aria-hidden className="material-symbols-rounded text-[22px]">{icon}</span>
    </button>
  );
}

function ActionRow({
  icon,
  label,
  destructive,
  onClick,
}: {
  icon: string;
  label: string;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition active:bg-black/5 ${
        destructive ? "text-destiny-red" : "text-destiny-grey dark:text-white"
      }`}
    >
      <span aria-hidden className="material-symbols-rounded text-[22px]">{icon}</span>
      {label}
    </button>
  );
}
