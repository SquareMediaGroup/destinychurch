"use client";

import { useMediaQuery } from "@/lib/useMediaQuery";

const DESKTOP_QUERY = "(min-width: 1024px)";

/**
 * True at the ≥1024px breakpoint, read synchronously.
 *
 * The admin editors branch their entire layout on this — a Modal on mobile, a
 * full-screen document surface on desktop. Reading the breakpoint in an effect
 * would mount the Modal branch first and then swap to a completely different
 * tree, which unmounts and recreates the whole TipTap instance. That silently
 * discarded undo history on every open, and with content blocks it would also
 * drop the selected block and any in-flight inspector edit. See useMediaQuery.
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
