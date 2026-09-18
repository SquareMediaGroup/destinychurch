import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { EYEBROW } from "@/components/blocks/tokens";

/**
 * The small orange label above a heading.
 *
 * The exact string `text-xs font-bold uppercase tracking-widest
 * text-destiny-orange` appeared in 73 places across 48 files. It has been named
 * in `components/blocks/tokens.ts` all along — this just makes it reachable
 * from a page without importing the block system's internals.
 *
 * An eyebrow is decoration for the heading beneath it, not a heading itself, so
 * it renders as a `<p>`. Making it an `<h*>` would put a rung on the document
 * outline that says "OUR MISSION" immediately above the real heading.
 */
export default function Eyebrow({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <p className={cn(EYEBROW, className)}>{children}</p>;
}
