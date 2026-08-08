"use client";

import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { BLOCK_CATEGORIES, BLOCK_LIST } from "@/components/blocks/registry";
import type { AnyBlockDefinition } from "@/components/blocks/types";
import { BLOCK_DRAG_MIME, insertBlock } from "./insertBlock";

/**
 * The block inserter.
 *
 * Deliberately its own surface rather than a set of buttons in the rich-text
 * toolbar. The toolbar formats the current text selection; blocks are
 * structural page furniture. Keeping them apart means neither has to be read
 * as a mixed list of "things that might do very different things", and the
 * toolbar stays identical across the four editors that share it.
 *
 * Two ways in, on purpose: click-to-insert works everywhere including touch,
 * and drag-to-place is the enhancement for people with a mouse. The copy says
 * so per layout — telling a phone user to drag a tile is telling them to try
 * something that cannot work.
 */
export function BlockPalette({
  editor,
  onInserted,
  layout = "sidebar",
}: {
  editor: Editor | null;
  /** Lets mobile close the sheet and open the settings sheet. */
  onInserted?: (def: AnyBlockDefinition) => void;
  /**
   * `sheet` is the phone layout: no heading of its own (the sheet has one), and
   * a two-column grid of tiles big enough to hit, the shape every mobile
   * inserter from Gutenberg to Notion converged on.
   */
  layout?: "sidebar" | "sheet";
}) {
  const [query, setQuery] = useState("");
  const sheet = layout === "sheet";

  const grouped = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = (block: AnyBlockDefinition) =>
      needle === "" ||
      block.label.toLowerCase().includes(needle) ||
      block.description.toLowerCase().includes(needle);

    return BLOCK_CATEGORIES.map((category) => ({
      ...category,
      blocks: BLOCK_LIST.filter(
        (block) => block.category === category.id && matches(block),
      ),
    })).filter((category) => category.blocks.length > 0);
  }, [query]);

  return (
    <div className="flex h-full flex-col">
      <div className={`shrink-0 px-4 ${sheet ? "pb-2 pt-3" : "border-b border-black/8 py-3"}`}>
        {!sheet && (
          <>
            <p className="text-sm font-black text-destiny-grey">Blocks</p>
            <p className="mt-0.5 text-xs text-destiny-grey/45">
              Click to add, or drag into the page.
            </p>
          </>
        )}
        <div className={`relative ${sheet ? "" : "mt-2.5"}`}>
          <span
            aria-hidden
            className="material-symbols-rounded pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-destiny-grey/35"
          >
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search blocks"
            placeholder="Search blocks"
            // 16px on phones: anything smaller and iOS Safari zooms the whole
            // page in the moment the field is focused.
            className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-base text-destiny-grey outline-none transition placeholder:text-destiny-grey/35 focus:border-destiny-orange/50 focus:ring-2 focus:ring-destiny-orange/15 lg:text-sm"
          />
        </div>
      </div>

      <div
        className={`flex min-h-0 flex-1 flex-col overflow-y-auto ${
          sheet ? "gap-5 px-4 py-3" : "gap-5 px-3 py-4"
        }`}
      >
        {grouped.map((category) => (
          <div key={category.id}>
            <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/35">
              {category.label}
            </p>
            <div className={sheet ? "grid grid-cols-2 gap-2" : "flex flex-col gap-1"}>
              {category.blocks.map((block) => (
                <PaletteTile
                  key={block.name}
                  def={block}
                  sheet={sheet}
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

        {grouped.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-destiny-grey/45">
            No blocks match “{query.trim()}”.
          </p>
        )}
      </div>
    </div>
  );
}

function PaletteTile({
  def,
  sheet,
  disabled,
  onInsert,
}: {
  def: AnyBlockDefinition;
  sheet: boolean;
  disabled: boolean;
  onInsert: () => void;
}) {
  const dragProps = {
    draggable: !disabled,
    onDragStart: (event: React.DragEvent) => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(BLOCK_DRAG_MIME, def.name);
      // Firefox won't start a drag without a standard-type payload, and
      // during dragover only dataTransfer.types is readable anyway — so the
      // private mime above is what the drop handler actually reads.
      event.dataTransfer.setData("text/plain", "");
    },
  };

  if (sheet) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onInsert}
        className="flex min-h-[104px] flex-col items-start gap-1.5 rounded-2xl border border-black/8 bg-white p-3 text-left transition active:scale-[0.98] active:bg-destiny-orange/5 disabled:opacity-40"
      >
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10 text-destiny-orange"
        >
          <span className="material-symbols-rounded text-[22px]">{def.icon}</span>
        </span>
        <span className="block text-sm font-bold text-destiny-grey">{def.label}</span>
        <span className="block text-xs leading-snug text-destiny-grey/45">
          {def.description}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onInsert}
      {...dragProps}
      className="group flex w-full items-start gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:border-black/8 hover:bg-white hover:shadow-sm disabled:opacity-40 [&:not(:disabled)]:cursor-grab [&:not(:disabled)]:active:cursor-grabbing"
    >
      <span
        aria-hidden
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-destiny-orange shadow-sm transition group-hover:bg-destiny-orange/10"
      >
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
