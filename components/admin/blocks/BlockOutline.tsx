"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { BLOCKS, blockNameFromNode } from "@/components/blocks/registry";
import { selectBlockAt } from "./blockCommands";

interface OutlineEntry {
  pos: number;
  blockName: string;
  summary: string;
}

/**
 * Every block in the document, as a jump list.
 *
 * The desktop answer to "change that block's settings" is to click the block —
 * which assumes you can see it and hit it. On a phone the settings sheet covers
 * most of the page, so this is how you get from one block to the next without
 * closing the sheet, scrolling, aiming, and opening it again. It is the same
 * idea as Gutenberg's list view, for the same reason.
 */
export function BlockOutline({
  editor,
  onPick,
  emptyState = null,
}: {
  editor: Editor | null;
  /** Fires after the selection moves, e.g. to swap a sheet to settings. */
  onPick?: () => void;
  /** Shown instead of the list when the page has no blocks yet. */
  emptyState?: React.ReactNode;
}) {
  const entries = useBlockOutline(editor);

  if (entries.length === 0) return <>{emptyState}</>;

  return (
    <div className="flex flex-col gap-1">
      {entries.map((entry) => {
        const def = BLOCKS[entry.blockName];
        return (
          <button
            key={entry.pos}
            type="button"
            onClick={() => {
              if (!editor) return;
              selectBlockAt(editor, entry.pos);
              onPick?.();
            }}
            className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-black/8 bg-white dark:border-white/8 dark:bg-destiny-grey-800 px-3 py-2 text-left transition active:bg-destiny-orange/5"
          >
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destiny-orange/10 text-destiny-orange"
            >
              <span className="material-symbols-rounded text-[18px]">
                {def?.icon ?? "help"}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-destiny-grey">
                {entry.summary}
              </span>
              <span className="block truncate text-xs text-destiny-grey/45">
                {def?.label ?? entry.blockName}
              </span>
            </span>
            <span
              aria-hidden
              className="material-symbols-rounded shrink-0 text-[18px] text-destiny-grey/30"
            >
              chevron_right
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Blocks are always top-level (the schema makes nesting structurally
 * impossible), so a shallow walk of the document's children is the whole list —
 * no recursion, and positions are exactly the ones a NodeSelection wants.
 */
function useBlockOutline(editor: Editor | null): OutlineEntry[] {
  return (
    useEditorState({
      editor,
      selector: ({ editor: instance }): OutlineEntry[] => {
        if (!instance) return [];
        const entries: OutlineEntry[] = [];
        // The offset of a top-level child *is* its document position, which is
        // exactly what NodeSelection.create wants.
        instance.state.doc.forEach((node, offset) => {
          const blockName = blockNameFromNode(node.type.name);
          if (!blockName) return;
          const def = BLOCKS[blockName];
          const props = (node.attrs.props ?? {}) as Record<string, unknown>;
          entries.push({
            pos: offset,
            blockName,
            summary: def?.summary?.(props) ?? def?.label ?? blockName,
          });
        });
        return entries;
      },
      // Compared by value: the selector allocates a fresh array every
      // transaction, so identity would re-render the panel on every keystroke.
      equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    }) ?? []
  );
}
