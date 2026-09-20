import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import Eyebrow from "@/components/ui/Eyebrow";
import { FONT_ROBOTO } from "@/components/blocks/tokens";

/**
 * Eyebrow + heading + lead paragraph, with an optional action link beside it.
 *
 * Every section on the site wrote its own heading, and they drifted apart in
 * every dimension at once. On the homepage alone: five `<h2>`s with five
 * different responsive ramps (`text-2xl sm:text-3xl md:text-4xl` four ways,
 * plus `text-3xl md:text-4xl lg:text-5xl`), three colours, and uppercase on
 * some but not others.
 *
 * One ramp here, one lead style, one action treatment.
 *
 * Two details that are load-bearing rather than stylistic:
 *
 *  - `style={{ fontFamily: FONT_ROBOTO }}`. `h1,h2,h3 { font-family:
 *    var(--font-heading) }` (Arial) is set in `@layer base` in globals.css, and
 *    a base-layer element selector beats every Tailwind `font-*` utility, so a
 *    class cannot override it. `components/ministry/*` already carries this
 *    inline escape hatch for the same reason — see the note at the top of
 *    `components/blocks/tokens.ts`.
 *
 *  - `level`. Visual size and outline depth are separate concerns: a heading
 *    nested inside a section that already has an `<h2>` needs to be an `<h3>`
 *    without shrinking. Default `h2`, which is right for a page section.
 */

export default function SectionHeading({
  eyebrow,
  title,
  lead,
  action,
  level = 2,
  align = "left",
  tone = "dark",
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Supporting sentence under the heading. */
  lead?: ReactNode;
  /** A secondary link rendered opposite the heading on wide screens. */
  action?: { label: string; href: string };
  level?: 1 | 2 | 3;
  align?: "left" | "center";
  /** `light` for sections on dark photography or a dark band. */
  tone?: "dark" | "light";
  className?: string;
}) {
  const Tag = `h${level}` as "h1" | "h2" | "h3";
  const centered = align === "center";

  return (
    <div
      className={cn(
        "gap-4 sm:flex sm:items-end",
        centered ? "sm:justify-center" : "sm:justify-between",
        className,
      )}
    >
      <div className={cn("max-w-2xl", centered && "mx-auto text-center")}>
        {eyebrow && (
          <Eyebrow className={cn("mb-3", tone === "light" && "text-white/80")}>
            {eyebrow}
          </Eyebrow>
        )}

        <Tag
          className={cn(
            "text-3xl font-black leading-tight tracking-[-0.02em] sm:text-4xl",
            tone === "light" ? "text-white" : "text-destiny-grey",
          )}
          style={{ fontFamily: FONT_ROBOTO }}
        >
          {title}
        </Tag>

        {lead && (
          <p
            className={cn(
              "mt-4 text-base leading-relaxed",
              tone === "light" ? "text-on-dark-muted" : "text-muted",
            )}
          >
            {lead}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className={cn(
            "mt-4 inline-flex shrink-0 items-center gap-1.5 text-sm font-bold transition hover:gap-2.5 sm:mt-0",
            tone === "light"
              ? "text-white hover:text-white"
              : "text-destiny-orange",
          )}
        >
          {action.label}
          <span aria-hidden="true">&rarr;</span>
        </Link>
      )}
    </div>
  );
}
