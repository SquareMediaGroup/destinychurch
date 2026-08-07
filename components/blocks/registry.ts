import type { AnyBlockDefinition } from "./types";
import { faqBlock } from "./faq/def";
import { calloutBlock } from "./callout/def";
import { quoteBlock } from "./quote/def";
import { cardGridBlock } from "./card-grid/def";
import { galleryBlock } from "./gallery/def";
import { buttonsBlock } from "./buttons/def";
import { videoBlock } from "./video/def";
import { churchSuiteBlock } from "./churchsuite/def";
import { embedBlock } from "./embed/def";

/**
 * The block registry — the single source of truth for what blocks exist.
 *
 * To add a block:
 *   1. create `components/blocks/<name>/{def.ts,<Name>Block.tsx}`
 *   2. import the def here and add it to BLOCK_LIST
 *
 * That is the whole checklist. If adding a block ever requires touching the
 * sidebar, the inspector, the Tiptap extensions or the public renderer, the
 * abstraction has leaked — fix that rather than adding a special case.
 *
 * This module must stay importable from a React Server Component, so it may not
 * import anything client-only (no "use client" modules, no Tiptap).
 */

// Order within a category is the order shown in the Blocks sidebar.
export const BLOCK_LIST: AnyBlockDefinition[] = [
  faqBlock,
  calloutBlock,
  quoteBlock,
  cardGridBlock,
  videoBlock,
  galleryBlock,
  buttonsBlock,
  churchSuiteBlock,
  embedBlock,
];

/** Lookup by wire name (the `data-block` attribute). */
export const BLOCKS: Record<string, AnyBlockDefinition> = Object.fromEntries(
  BLOCK_LIST.map((block) => [block.name, block]),
);

/**
 * Blocks are kebab-case on the wire but ProseMirror node names can't contain
 * hyphens, so the two namespaces are bridged here rather than at each call site.
 */
export function nodeNameFor(blockName: string): string {
  return `dcBlock_${blockName.replace(/-/g, "_")}`;
}

export function blockNameFromNode(nodeName: string): string | null {
  if (!nodeName.startsWith("dcBlock_")) return null;
  return nodeName.slice("dcBlock_".length).replace(/_/g, "-");
}

/**
 * Sidebar grouping. Order here is the order shown to admins.
 *
 * `advanced` is last on purpose: it holds the raw-HTML escape hatch, which
 * should be the thing you reach for only after scanning everything above it.
 */
export const BLOCK_CATEGORIES = [
  { id: "content", label: "Content" },
  { id: "layout", label: "Layout" },
  { id: "media", label: "Media" },
  { id: "action", label: "Action" },
  { id: "advanced", label: "Advanced" },
] as const;
