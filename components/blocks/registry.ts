import type { AnyBlockDefinition } from "./types";
import { faqBlock } from "./faq/def";

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

export const BLOCK_LIST: AnyBlockDefinition[] = [faqBlock];

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

/** Sidebar grouping. Order here is the order shown to admins. */
export const BLOCK_CATEGORIES = [
  { id: "content", label: "Content" },
  { id: "layout", label: "Layout" },
  { id: "media", label: "Media" },
  { id: "action", label: "Action" },
] as const;
