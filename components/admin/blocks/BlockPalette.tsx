"use client";

import type { Editor } from "@tiptap/react";
import { BLOCK_CATEGORIES, BLOCK_LIST } from "@/components/blocks/registry";
import type { AnyBlockDefinition } from "@/components/blocks/types";
import { BLOCK_DRAG_MIME, insertBlock } from "./insertBlock";

/**
 * The Blocks sidebar.
 *
 * Deliberately its own surface rather than a set of buttons in the rich-text
 * toolbar. The toolbar formats the current text selection; blocks are
 * structural page furniture. Keeping them apart means neither has to be read
 * as a mixed list of "things that might do very different things", and the
 * toolbar stays identical across the four editors that share it.
 *
 * Two ways in, on purpose: click-to-insert works everywhere including touch,
 * and drag-to-place is the enhancement for people with a mouse.
 */
export function BlockPalette({
  editor,
  onInserted,
}: {
  editor: Editor | null;
  /** Lets mobile close the sheet and open the settings sheet. */
  onInserted?: (def: AnyBlockDefinition) => void;
}) {
  const grouped = BLOCK_CATEGORIES.map((category) => ({
    ...category,
    blocks: BLOCK_LIST.filter((block) => block.category === category.id),
  })).filter((category) => category.blocks.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/8 px-4 py-3">
        <p className="text-sm font-black text-destiny-grey">Blocks</p>
        <p className="mt-0.5 text-xs text-destiny-grey/45">
          Click to add, or drag into the page.
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {grouped.map((category) => (
          <div key={category.id}>
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/35">
              {category.label}
            </p>
            <div className="flex flex-col gap-1">
              {category.blocks.map((block) => (
                <PaletteTile
                  key={block.name}
                  def={block}
                  disabled={!editor}
                  onInsert={() => {
                    if (!editor) return;
                    insertBlock(editor, block);
                    onInserted?.(block);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PaletteTile({
  def,
  disabled,
  onInsert,
}: {
  def: AnyBlockDefinition;
  disabled: boolean;
  onInsert: () => void;
}) {
  return (
    <button
      type="button"
      draggable={!disabled}
      disabled={disabled}
      onClick={onInsert}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData(BLOCK_DRAG_MIME, def.name);
        // Firefox won't start a drag without a standard-type payload, and
        // during dragover only dataTransfer.types is readable anyway — so the
        // private mime above is what the drop handler actually reads.
        event.dataTransfer.setData("text/plain", "");
      }}
      className="group flex w-full items-start gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:border-black/8 hover:bg-white hover:shadow-sm disabled:opacity-40 [&:not(:disabled)]:cursor-grab [&:not(:disabled)]:active:cursor-grabbing"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-destiny-orange shadow-sm transition group-hover:bg-destiny-orange/10">
        <span className="material-symbols-rounded text-[19px]">{def.icon}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-destiny-grey">{def.label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-destiny-grey/45">
          {def.description}
        </span>
      </span>
    </button>
  );
}
