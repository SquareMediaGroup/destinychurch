"use client";

import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { BLOCKS, nodeNameFor } from "@/components/blocks/registry";
import type { AnyBlockDefinition } from "@/components/blocks/types";

/**
 * Drag payload mime for palette tiles.
 *
 * A private type rather than text/plain so a drop can be told apart from a
 * normal text drag, from a repeater-row drag inside the inspector, and from
 * ProseMirror moving an existing node.
 */
export const BLOCK_DRAG_MIME = "application/x-dc-block";

/**
 * Insert a block at the cursor.
 *
 * This is the path that works everywhere, including touch, so it stays the
 * primary affordance — drag-to-insert is an enhancement on top.
 */
export function insertBlock(editor: Editor, def: AnyBlockDefinition) {
  const { state } = editor;
  const nodeType = state.schema.nodes[nodeNameFor(def.name)];
  if (!nodeType) return;

  const node = nodeType.create({ props: def.defaults });
  const { $from } = state.selection;
  const tr = state.tr;

  let at: number;
  if ($from.depth === 0) {
    at = state.selection.to;
    tr.insert(at, node);
  } else {
    const topNode = $from.node(1);
    const start = $from.before(1);
    // Replacing an empty trailing paragraph rather than inserting after it is
    // the difference between feeling native and leaving a blank gap above every
    // block the author adds.
    const isEmptyParagraph =
      topNode.type.name === "paragraph" && topNode.content.size === 0;
    if (isEmptyParagraph) {
      at = start;
      tr.replaceWith(start, $from.after(1), node);
    } else {
      at = start + topNode.nodeSize;
      tr.insert(at, node);
    }
  }

  // Select the new block so the inspector opens straight onto it.
  tr.setSelection(NodeSelection.create(tr.doc, at));
  editor.view.dispatch(tr.scrollIntoView());
}

/**
 * `editorProps.handleDrop` for palette drags.
 *
 * Returns false for anything that isn't one of our palette tiles, so
 * ProseMirror's own drag handling (moving an existing block, dropping text) is
 * untouched.
 */
export function blockDropHandler(
  view: EditorView,
  event: DragEvent,
  _slice: unknown,
  moved: boolean,
): boolean {
  // `moved` means ProseMirror is relocating a node from within the document —
  // that's the drag-handle reorder path, which it handles correctly itself.
  if (moved) return false;

  const name = event.dataTransfer?.getData(BLOCK_DRAG_MIME);
  const def = name ? BLOCKS[name] : undefined;
  if (!def) return false;

  const nodeType = view.state.schema.nodes[nodeNameFor(def.name)];
  if (!nodeType) return false;

  const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
  if (!coords) return false;

  // Land between top-level nodes, never inside one.
  const $pos = view.state.doc.resolve(coords.pos);
  const at = $pos.depth > 0 ? $pos.after(1) : coords.pos;

  const node = nodeType.create({ props: def.defaults });
  const tr = view.state.tr.insert(at, node);
  tr.setSelection(NodeSelection.create(tr.doc, at));
  view.dispatch(tr.scrollIntoView());

  event.preventDefault();
  return true;
}
