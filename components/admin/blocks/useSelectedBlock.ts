"use client";

import { useEditorState, type Editor } from "@tiptap/react";
import { NodeSelection } from "@tiptap/pm/state";
import { blockNameFromNode } from "@/components/blocks/registry";

export interface SelectedBlock {
  pos: number;
  blockName: string;
  /** Serialised so the selector can compare by value, not identity. */
  propsJson: string;
  /**
   * Whether a neighbour exists in that direction.
   *
   * Computed here rather than at the call site because it has to be part of the
   * memoised snapshot: inserting a block *after* the selected one leaves `pos`
   * untouched, so anything derived outside the selector would go stale and the
   * toolbar would show "move down" as unavailable when it isn't.
   */
  canMoveUp: boolean;
  canMoveDown: boolean;
}

/**
 * The currently selected block, or null.
 *
 * Uses `useEditorState` rather than subscribing to every transaction, which
 * keeps the inspector off the per-keystroke render path — otherwise typing a
 * paragraph anywhere in the document would re-render the whole settings panel.
 *
 * The selector returns primitives and the equality check compares them by
 * value; returning the ProseMirror node itself would produce a new object each
 * transaction and defeat the memoisation entirely.
 */
export function useSelectedBlock(editor: Editor | null): SelectedBlock | null {
  return useEditorState({
    editor,
    selector: ({ editor: instance }): SelectedBlock | null => {
      if (!instance) return null;
      const selection = instance.state.selection;
      if (!(selection instanceof NodeSelection)) return null;

      const blockName = blockNameFromNode(selection.node.type.name);
      if (!blockName) return null;

      const $pos = instance.state.doc.resolve(selection.from);
      const index = $pos.index();

      return {
        pos: selection.from,
        blockName,
        propsJson: JSON.stringify(selection.node.attrs.props ?? {}),
        canMoveUp: index > 0,
        canMoveDown: index < $pos.parent.childCount - 1,
      };
    },
    equalityFn: (a, b) =>
      a?.pos === b?.pos &&
      a?.blockName === b?.blockName &&
      a?.propsJson === b?.propsJson &&
      a?.canMoveUp === b?.canMoveUp &&
      a?.canMoveDown === b?.canMoveDown,
  });
}
