"use client";

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { decodeProps, encodeProps } from "@/components/blocks/serialize";
import { nodeNameFor } from "@/components/blocks/registry";
import type { AnyBlockDefinition } from "@/components/blocks/types";
import { makeBlockNodeView } from "./BlockNodeView";

/**
 * Build a TipTap node from a registry entry.
 *
 * Every block gets its node from here — there are no hand-written per-block
 * nodes. That is what keeps "adding a block is one directory plus one registry
 * line" true.
 */
export function createBlockNode(def: AnyBlockDefinition) {
  return Node.create({
    name: nodeNameFor(def.name),

    // NOT "block". See BlockDocument.ts — the separate group is what makes
    // nesting a block inside a blockquote or list item schema-impossible, which
    // in turn is what makes RichContent's regex split provably correct.
    group: "dcblock",

    atom: true,
    selectable: true,
    // prosemirror-view reads this to set dom.draggable on a node view that has
    // no contentDOM; without it [data-drag-handle] does nothing.
    draggable: true,
    isolating: true,
    defining: true,

    addAttributes() {
      return {
        props: {
          default: def.defaults,
          parseHTML: (element) =>
            decodeProps(
              def,
              element.getAttribute("data-props"),
              Number(element.getAttribute("data-block-version") ?? def.version),
            ),
          // Serialisation is done by renderHTML below, not per-attribute, so
          // that attribute order is fully under our control.
          renderHTML: () => ({}),
        },
      };
    },

    parseHTML() {
      // Priority above UnknownBlock's 40, so a registered block always wins.
      return [{ tag: `div[data-block="${def.name}"]`, priority: 60 }];
    },

    /*
     * Hand-written, deliberately NOT mergeAttributes.
     *
     * RichContent matches this markup with a regex that expects exactly this
     * attribute order. mergeAttributes would let extensions inject or reorder
     * attributes, which would silently stop every block on every page from
     * rendering. tests/unit/blocks-wire-format.spec.ts pins the shape, and
     * RichContent warns in dev if it ever drifts.
     */
    renderHTML({ node }) {
      return [
        "div",
        {
          "data-block": def.name,
          "data-block-version": String(def.version),
          "data-props": encodeProps(node.attrs.props),
        },
      ];
    },

    addNodeView() {
      // No `stopEvent` option on purpose: overriding it short-circuits TipTap's
      // default, which is what records that a drag began on [data-drag-handle].
      // The default already returns true for the buttons inside the chrome.
      return ReactNodeViewRenderer(makeBlockNodeView(def));
    },
  });
}
