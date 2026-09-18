import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The horizontal frame: one max-width plus the site's gutters.
 *
 * `mx-auto max-w-* px-4 lg:px-8` was hand-written in 67 places across 42 files,
 * and six different max-widths were in active use (7xl ×71, 3xl ×47, 2xl ×36,
 * 4xl ×32, 6xl ×27, 5xl ×25) with no rule about which meant what. That is not
 * six deliberate layouts, it is one layout guessed at six times.
 *
 * Three widths, named for the job rather than the number:
 *
 *   prose    max-w-3xl   a single column of reading text — legal pages, FAQ
 *                        answers, a mission statement. Caps the measure at
 *                        roughly 75 characters.
 *   content  max-w-5xl   text with supporting media: split sections, forms,
 *                        two-up card rows.
 *   wide     max-w-7xl   full section layouts — card grids, hero content,
 *                        the header and footer. The site's default.
 *
 * The gutter is always `px-4 lg:px-8`. It is deliberately not configurable:
 * every page needs to agree on where the page edge is, and `EventsCarousel`
 * already depends on that agreement — it bleeds its scroll rail past the
 * gutter with a matching `-mx-4 lg:-mx-8`, which silently breaks if a container
 * somewhere uses different padding.
 */

const WIDTHS = {
  prose: "max-w-3xl",
  content: "max-w-5xl",
  wide: "max-w-7xl",
} as const;

export type ContainerWidth = keyof typeof WIDTHS;

export default function Container({
  width = "wide",
  as: Tag = "div",
  className,
  children,
}: {
  width?: ContainerWidth;
  /** Use a landmark element where one is meaningful, e.g. `as="nav"`. */
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn("mx-auto px-4 lg:px-8", WIDTHS[width], className)}>
      {children}
    </Tag>
  );
}
