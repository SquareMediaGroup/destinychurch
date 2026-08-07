"use client";

import Document from "@tiptap/extension-document";

/**
 * Document schema that admits content blocks alongside normal prose.
 *
 * Blocks belong to the `dcblock` group rather than `block`, and this is the
 * only place that group is admitted. Because `blockquote` and `listItem`
 * declare `content: "block+"`, a block inside one of them becomes structurally
 * impossible rather than merely unlikely.
 *
 * That is not a nicety. `components/content/RichContent.tsx` splits the stored
 * HTML with a regex, which is only correct if a block div is always a
 * top-level, self-contained token. A block nested inside a <blockquote> would
 * split the surrounding markup into unbalanced halves. Enforcing it in the
 * schema is what turns that from an assumption into an invariant.
 *
 * Only wired in when the editor is given a `blocks` prop, so the surfaces that
 * don't use blocks keep the stock Document.
 */
export const BlockDocument = Document.extend({
  content: "(block | dcblock)+",
});
