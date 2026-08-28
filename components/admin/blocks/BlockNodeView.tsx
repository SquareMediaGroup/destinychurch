"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import type { AnyBlockDefinition } from "@/components/blocks/types";
import {
  addParagraphAfter,
  duplicateBlockAt,
  moveBlockAt,
} from "./blockCommands";

/**
 * The editor-side shell around a block.
 *
 * Renders the real, shared block component — the same module the public page
 * uses — wrapped in selection chrome. That is what makes the editor properly
 * WYSIWYG rather than showing a placeholder.
 *
 * The chrome bar is desktop-only. It is revealed on hover, which touch does not
 * have, and its controls are 24px, which a thumb does not have either — so on
 * phones a block is selected by tapping it and driven from the fixed toolbar in
 * BlockTools instead. What stays on mobile is the part that was missing: an
 * always-visible label, so a block reads as one tappable object rather than as
 * page content the author is about to try (and fail) to edit inline.
 */
export function makeBlockNodeView(def: AnyBlockDefinition) {
  return function BlockNodeView({
    node,
    editor,
    selected,
    getPos,
    deleteNode,
  }: ReactNodeViewProps) {
    const props = node.attrs.props as Record<string, unknown>;
    const Component = def.Component;
    const summary = def.summary?.(props) ?? def.label;

    /** Run a command against this block's live position. */
    const at = (run: (pos: number) => void) => () => {
      const pos = getPos();
      if (typeof pos === "number") run(pos);
    };

    const select = at((pos) => editor.commands.setNodeSelection(pos));

    return (
      <NodeViewWrapper
        as="div"
        data-dc-block={def.name}
        // my-12 rather than my-8: the chrome bar below sits in this margin
        // (~37px plus a 4px gap), and it needs room without colliding with the
        // block above.
        //
        // scroll-mb clears the mobile block toolbar, so a block selected from
        // the palette or the outline doesn't land underneath it.
        className={`dc-block-shell group relative my-12 scroll-mb-32 rounded-xl transition lg:scroll-mb-0 ${
          selected ? "outline outline-2 outline-offset-4 outline-destiny-orange/60" : ""
        }`}
        onClick={select}
      >
        {/* Mobile: a standing label, because there is no hover to reveal one. */}
        <div
          contentEditable={false}
          data-on={selected}
          className="absolute bottom-full left-2 z-10 mb-1 flex max-w-[calc(100%-1rem)] items-center gap-1 rounded-md bg-black/5 px-1.5 py-0.5 text-destiny-grey/45 transition data-[on=true]:bg-destiny-orange/15 data-[on=true]:text-destiny-orange lg:hidden"
        >
          <span aria-hidden className="material-symbols-rounded text-[13px]">{def.icon}</span>
          <span className="truncate text-[10px] font-bold uppercase tracking-wider">
            {summary}
          </span>
        </div>

        <div
          contentEditable={false}
          data-on={selected}
          // bottom-full anchors the bar's bottom edge to the block's top edge,
          // so it always clears the block's own first element whatever height
          // the chrome happens to be. A fixed negative offset doesn't: -top-8
          // assumed ~28px and the bar is 37px, so it sat 5px over the heading.
          className="absolute bottom-full left-3 z-10 mb-1 hidden items-center gap-0.5 rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-destiny-grey-800 px-1 py-0.5 opacity-0 shadow-sm transition focus-within:opacity-100 group-hover:opacity-100 data-[on=true]:opacity-100 lg:flex"
        >
          {/*
            Deliberately a <span>, not a <button>.

            TipTap's NodeView.stopEvent returns early for INPUT/BUTTON/SELECT/
            TEXTAREA targets, *before* the bookkeeping that records a drag has
            started from [data-drag-handle]. A <button data-drag-handle> is
            therefore silently undraggable. The chrome buttons below are real
            <button>s precisely because that early return is what they want.
          */}
          <span
            data-drag-handle
            role="button"
            tabIndex={-1}
            aria-label="Drag to reorder"
            title="Drag to reorder"
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-destiny-grey/40 hover:bg-black/5 active:cursor-grabbing"
          >
            <span className="material-symbols-rounded text-[18px]">drag_indicator</span>
          </span>

          <span className="px-1 text-[11px] font-bold uppercase tracking-wider text-destiny-grey/45">
            {summary}
          </span>

          <ChromeButton
            icon="keyboard_arrow_up"
            label="Move up"
            onClick={at((pos) => moveBlockAt(editor, pos, -1))}
          />
          <ChromeButton
            icon="keyboard_arrow_down"
            label="Move down"
            onClick={at((pos) => moveBlockAt(editor, pos, 1))}
          />
          <ChromeButton
            icon="content_copy"
            label="Duplicate"
            onClick={at((pos) => duplicateBlockAt(editor, pos))}
          />
          <ChromeButton
            icon="add"
            label="Add paragraph below"
            onClick={at((pos) => addParagraphAfter(editor, pos))}
          />
          <ChromeButton icon="delete" label="Delete" onClick={deleteNode} />
        </div>

        {/*
          Click shield. Blocks render real links, <summary> toggles and form
          controls; inside the editor those must not activate. Sits above the
          block (z-[1]) but below the chrome (z-10).
        */}
        <div className="absolute inset-0 z-[1]" aria-hidden />

        <Component {...props} mode="edit" />
      </NodeViewWrapper>
    );
  };
}

function ChromeButton({
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
      aria-label={label}
      title={label}
      // Keep focus in the editor so the selection (and the inspector) survives.
      onMouseDown={(event) => event.preventDefault()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className="flex h-6 w-6 items-center justify-center rounded text-destiny-grey/45 transition hover:bg-black/5 hover:text-destiny-grey"
    >
      <span className="material-symbols-rounded text-[16px]">{icon}</span>
    </button>
  );
}
