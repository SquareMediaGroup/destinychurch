"use client";

import { Node } from "@tiptap/core";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";

/**
 * Catch-all node for `<div data-block>` markers with no matching registry entry.
 *
 * This exists to prevent silent, permanent data loss, and it is not optional.
 *
 * ProseMirror drops any element its schema doesn't recognise. So if a block is
 * removed from the registry, or a deploy is rolled back to before that block
 * existed, opening an affected page in the editor would quietly discard the
 * block — and the author's next save would write that loss to the database. The
 * content would be unrecoverable.
 *
 * With this node in the schema the marker survives the round trip untouched and
 * the author sees a clear placeholder instead. When the code comes back, so
 * does the block.
 */
export const UnknownBlock = Node.create({
  name: "dcBlockUnknown",
  group: "dcblock",
  atom: true,
  selectable: true,
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      blockName: { default: "" },
      blockVersion: { default: "1" },
      // The RAW attribute string, kept verbatim.
      raw: { default: "{}" },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-block]",
        // Below every registered block's 60, so this only ever catches leftovers.
        priority: 40,
        getAttrs: (element) => {
          const el = element as HTMLElement;
          return {
            blockName: el.getAttribute("data-block") ?? "",
            blockVersion: el.getAttribute("data-block-version") ?? "1",
            raw: el.getAttribute("data-props") ?? "{}",
          };
        },
      },
    ];
  },

  /*
   * Re-emit `raw` exactly as it came in — do NOT run it back through
   * encodeProps. We have no schema for these props, so re-encoding could
   * normalise or drop keys the absent block still needs. Verbatim is the whole
   * point of this node.
   */
  renderHTML({ node }) {
    return [
      "div",
      {
        "data-block": node.attrs.blockName,
        "data-block-version": node.attrs.blockVersion,
        "data-props": node.attrs.raw,
      },
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(UnknownBlockView);
  },
});

function UnknownBlockView({ node, deleteNode }: ReactNodeViewProps) {
  return (
    <NodeViewWrapper
      as="div"
      className="dc-block-shell my-8 rounded-xl border-2 border-dashed border-destiny-grey/25 bg-[#f5f7fa] p-5"
    >
      <div contentEditable={false} className="flex items-start gap-3">
        <span className="material-symbols-rounded shrink-0 text-[20px] text-destiny-grey/40">
          help
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-destiny-grey">
            Unavailable block
            <span className="ml-1.5 font-medium text-destiny-grey/45">
              ({node.attrs.blockName || "unknown"})
            </span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-destiny-grey/55">
            This block isn&apos;t available in the current version of the site.
            Its content has been kept and will reappear on its own — leave it
            alone unless you&apos;re sure you want it gone.
          </p>
        </div>
        <button
          type="button"
          onClick={deleteNode}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold text-destiny-grey/45 transition hover:bg-black/5 hover:text-destiny-red"
        >
          Remove
        </button>
      </div>
    </NodeViewWrapper>
  );
}
