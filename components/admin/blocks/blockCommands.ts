"use client";

import type { Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";

/**
 * Document operations on a block, addressed by position.
 *
 * These used to live inside BlockNodeView, which meant only the chrome bar
 * floating over a block could run them. That bar is hover-revealed and its
 * buttons are 24px, so on a phone it was effectively unreachable — the mobile
 * toolbar in BlockTools drives the very same operations from a position and at
 * a size a thumb can actually hit. Sharing them from here is what keeps the two
 * surfaces honestly identical rather than two implementations that drift.
 */

/** Move a block past its neighbour. Silently no-ops at either end. */
export function moveBlockAt(editor: Editor, pos: number, direction: -1 | 1) {
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

export function duplicateBlockAt(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const at = pos + node.nodeSize;
  const tr = editor.state.tr.insert(at, node.copy(node.content));
  tr.setSelection(NodeSelection.create(tr.doc, at));
  editor.view.dispatch(tr.scrollIntoView());
}

/**
 * Gapcursor already lets you click below a trailing block and type, but it is
 * not discoverable — and on touch there is no gapcursor at all, so without this
 * a block at the end of the document is a dead end.
 */
export function addParagraphAfter(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  const at = pos + node.nodeSize;
  const paragraph = editor.state.schema.nodes.paragraph.create();
  const tr = editor.state.tr.insert(at, paragraph);
  tr.setSelection(
    NodeSelection.near(tr.doc.resolve(Math.min(at + 1, tr.doc.content.size))),
  );
  editor.view.dispatch(tr.scrollIntoView());
  editor.commands.focus();
}

export function deleteBlockAt(editor: Editor, pos: number) {
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor.view.dispatch(editor.state.tr.delete(pos, pos + node.nodeSize));
}

/**
 * Select a block and bring it into view.
 *
 * `scrollIntoView()` on the transaction moves the editor's own scroll container;
 * the DOM call afterwards centres it in the page, which is what actually helps
 * when the editor is a short box inside a scrolling admin modal.
 */
export function selectBlockAt(editor: Editor, pos: number) {
  const { state } = editor;
  if (!state.doc.nodeAt(pos)) return;
  const tr = state.tr.setSelection(NodeSelection.create(state.doc, pos));
  editor.view.dispatch(tr.scrollIntoView());

  const dom = editor.view.nodeDOM(pos);
  if (dom instanceof HTMLElement) {
    dom.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}
