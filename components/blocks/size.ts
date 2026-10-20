// How far a media or layout block may reach past the reading column on a
// Posts page. A prop on the block (not a wire-format attribute — BLOCK_RE pins
// the attribute shape), defaulting to "normal" so every block authored before
// this existed parses unchanged.
//
//   normal  the 768px reading column, as before
//   wide    up to ~1100px on large screens
//   full    edge to edge
//
// Honoured only where the caller opts in (RichContent's `allowWide`, which only
// app/[slug]/page.tsx passes). Training posts, jobs and shop descriptions keep
// every block in the column. A Posts page with any wide or full block drops
// its promo rails: full-bleed needs the article centred, and at 1600px+ the
// rails put it in an off-centre grid track (see types.ts on BlockWidth).
import { z } from "zod";
import { BLOCK_RE, unescapeAttr } from "./serialize";
import type { LeafFieldSchema } from "./types";

export const BLOCK_SIZES = ["normal", "wide", "full"] as const;
export type BlockSize = (typeof BLOCK_SIZES)[number];

export const sizeSchema = z.enum(BLOCK_SIZES).default("normal");

export const sizeField: LeafFieldSchema = {
  kind: "select",
  name: "size",
  label: "Width",
  help: "Wide and Full reach past the text on big screens. A page with either hides its promo sidebars.",
  options: [
    { value: "normal", label: "Normal (same as the text)" },
    { value: "wide", label: "Wide" },
    { value: "full", label: "Full width" },
  ],
};

export function blockSize(props: unknown): BlockSize {
  const size = (props as { size?: unknown } | null)?.size;
  return BLOCK_SIZES.includes(size as BlockSize) ? (size as BlockSize) : "normal";
}

/** True when the stored HTML has a block set to Wide or Full. */
export function hasWideBlocks(html: string | null | undefined): boolean {
  if (!html || !html.includes("data-block=")) return false;
  for (const [, , , rawProps] of html.matchAll(BLOCK_RE)) {
    try {
      if (blockSize(JSON.parse(unescapeAttr(rawProps))) !== "normal") return true;
    } catch {
      // A malformed block renders as its defaults, which are "normal".
    }
  }
  return false;
}

/** Wrapper classes for a block of this size; see `.dc-bleed` in globals.css. */
export const SIZE_CLASS: Record<BlockSize, string> = {
  normal: "",
  // 768px column + 2 × 10rem = ~1088px at xl; a smaller reach at lg.
  wide: "lg:-mx-24 xl:-mx-40",
  full: "dc-bleed",
};
