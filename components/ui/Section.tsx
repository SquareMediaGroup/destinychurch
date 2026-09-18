import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import Container, { type ContainerWidth } from "@/components/ui/Container";
import { TONE_SURFACE } from "@/components/blocks/tokens";
import type { Tone } from "@/components/blocks/types";

/**
 * A page section: a tinted band with vertical rhythm and a container inside.
 *
 * Section padding was picked per-section rather than from a scale — py-20 ×62,
 * py-16 ×52, py-24 ×9, plus py-10, py-12, py-14, py-32 and the two arbitrary
 * ones on /visit and /give (py-[12rem] and py-[10rem], fixed at every
 * breakpoint, so a phone gets a 384px band of nothing). Worse, /whats-on has
 * sections with `pb-0` that rely on the *next* section's `pt` to breathe, so
 * reordering them changes the spacing.
 *
 * Three steps, each responsive, each self-contained:
 *
 *   sm   py-12 sm:py-16    tight bands — a CTA strip, a logo row
 *   md   py-16 sm:py-20    the default
 *   lg   py-20 sm:py-28    a section that should feel like a chapter break
 *
 * `tone` reuses TONE_SURFACE from the block system rather than redefining the
 * palette, so an admin-authored block and a hand-built section on the same page
 * land on exactly the same background. `light` and `muted` are the pair that
 * alternate down a page; the pillar tones are for accent bands.
 *
 * `dark` is the one tone added here rather than inherited. It has to be a tone
 * rather than something you reach for `className` with, because `cn()` does not
 * resolve Tailwind conflicts: passing `className="bg-destiny-grey"` alongside
 * the default `bg-white` leaves the winner down to which rule Tailwind emitted
 * last, which is not something a call site can reason about. (This is the same
 * trap `components/ui/Button.tsx` warns about for padding.) A background you
 * can only set by fighting the stylesheet is a missing option, not a niche
 * case — /whats-on and the homepage both have dark bands.
 */

const PADDING = {
  sm: "py-12 sm:py-16",
  md: "py-16 sm:py-20",
  lg: "py-20 sm:py-28",
  /** Opt out entirely — for a section that manages its own inset shell. */
  none: "",
} as const;

export type SectionPadding = keyof typeof PADDING;

/** The block tones, plus a dark band the block system has no equivalent for. */
const SURFACES: Record<SectionTone, string> = {
  ...TONE_SURFACE,
  dark: "bg-destiny-grey",
};

export type SectionTone = Tone | "dark";

export default function Section({
  tone = "light",
  padding = "md",
  width = "wide",
  id,
  className,
  containerClassName,
  children,
}: {
  tone?: SectionTone;
  padding?: SectionPadding;
  width?: ContainerWidth;
  /** Anchor target, for in-page navigation like /give's three jump links. */
  id?: string;
  /** Classes for the outer band — background overrides, `overflow-hidden`. */
  className?: string;
  /** Classes for the inner container — grid definitions, text alignment. */
  containerClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(SURFACES[tone], PADDING[padding], className)}
    >
      <Container width={width} className={containerClassName}>
        {children}
      </Container>
    </section>
  );
}
