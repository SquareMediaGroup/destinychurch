"use client";

import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { AnyBlockDefinition } from "@/components/blocks/types";

/**
 * The editor-side shell around a block.
 *
 * Renders the real, shared block component — the same module the public page
 * uses — wrapped in selection chrome. That is what makes the editor properly
 * WYSIWYG rather than showing a placeholder.
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

    const select = () => {
      const pos = getPos();
      if (typeof pos === "number") editor.commands.setNodeSelection(pos);
    };

    return (
      <NodeViewWrapper
        as="div"
        data-dc-block={def.name}
        // my-12 rather than my-8: the chrome bar below sits in this margin
        // (~37px plus a 4px gap), and it needs room without colliding with the
        // block above.
        className={`dc-block-shell group relative my-12 rounded-xl transition ${
          selected ? "outline outline-2 outline-offset-4 outline-destiny-orange/60" : ""
        }`}
        onClick={select}
      >
        <div
          contentEditable={false}
          data-on={selected}
          // bottom-full anchors the bar's bottom edge to the block's top edge,
          // so it always clears the block's own first element whatever height
          // the chrome happens to be. A fixed negative offset doesn't: -top-8
          // assumed ~28px and the bar is 37px, so it sat 5px over the heading.
          className="absolute bottom-full left-3 z-10 mb-1 flex items-center gap-0.5 rounded-lg border border-black/10 bg-white px-1 py-0.5 opacity-0 shadow-sm transition focus-within:opacity-100 group-hover:opacity-100 data-[on=true]:opacity-100"
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
            {def.summary?.(props) ?? def.label}
          </span>

          <ChromeButton
            icon="keyboard_arrow_up"
            label="Move up"
            onClick={() => moveBlock(editor, getPos, -1)}
          />
          <ChromeButton
            icon="keyboard_arrow_down"
            label="Move down"
            onClick={() => moveBlock(editor, getPos, 1)}
          />
          <ChromeButton
            icon="content_copy"
            label="Duplicate"
            onClick={() => duplicateBlock(editor, getPos, node)}
          />
          <ChromeButton
            icon="add"
            label="Add paragraph below"
            onClick={() => addParagraphBelow(editor, getPos, node)}
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

type GetPos = () => number | undefined;

/**
 * Move a block past its neighbour.
 *
 * This is the touch and keyboard reorder path — HTML5 drag has neither, so the
 * grip alone would make reordering impossible on a tablet.
 */
function moveBlock(editor: Editor, getPos: GetPos, direction: -1 | 1) {
  const pos = getPos();
  if (typeof pos !== "number") return;

  const { state } = editor;
  const node = state.doc.nodeAt(pos);
  if (!node) return;

  const $pos = state.doc.resolve(pos);
  const index = $pos.index();
  const parent = $pos.parent;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= parent.childCount) return;

  const neighbour = parent.child(targetIndex);
  const insertAt =
    direction === 1
      ? pos + neighbour.nodeSize // past the node that follows
      : pos - neighbour.nodeSize;

  const tr = state.tr.delete(pos, pos + node.nodeSize);
  tr.insert(tr.mapping.map(insertAt), node);
  tr.setSelection(NodeSelection.create(tr.doc, tr.mapping.map(insertAt)));
  editor.view.dispatch(tr.scrollIntoView());
}

function duplicateBlock(editor: Editor, getPos: GetPos, node: PMNode) {
  const pos = getPos();
  if (typeof pos !== "number") return;
  const at = pos + node.nodeSize;
  const tr = editor.state.tr.insert(at, node.copy(node.content));
  tr.setSelection(NodeSelection.create(tr.doc, at));
  editor.view.dispatch(tr.scrollIntoView());
}

/**
 * Gapcursor already lets you click below a trailing block and type, but it is
 * not discoverable — an explicit button is.
 */
function addParagraphBelow(editor: Editor, getPos: GetPos, node: PMNode) {
  const pos = getPos();
  if (typeof pos !== "number") return;
  const at = pos + node.nodeSize;
  const paragraph = editor.state.schema.nodes.paragraph.create();
  const tr = editor.state.tr.insert(at, paragraph);
  tr.setSelection(
    NodeSelection.near(tr.doc.resolve(Math.min(at + 1, tr.doc.content.size))),
  );
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
}
