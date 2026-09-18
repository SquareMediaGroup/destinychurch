import Link from "next/link";
import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The site's card shell.
 *
 * The literal `rounded-[20px] border border-black/[0.07] shadow-[0_1px_2px
 * rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)]` was pasted verbatim
 * into 16 files, and around it grew a second population of cards using
 * `shadow-lg`, `shadow-md` or `shadow-sm` with `rounded-2xl` or `rounded-3xl`.
 * Four shadow languages and four radii for one component.
 *
 * This renders the canonical one via the `shadow-card` / `rounded-card` tokens
 * added to globals.css.
 *
 * ## `href` is not a convenience
 *
 * `GetInvolvedSection` is the case that motivated it: the card scales its image
 * on `group-hover` across the whole surface, so it reads as one big target —
 * but only the small pill at the bottom was a link. On a phone that is a ~180px
 * tap target inside a 400px card that looks tappable everywhere.
 *
 * Passing `href` makes the card itself the link, so the hover affordance and
 * the hit area agree. It also means one tab stop and one announcement instead
 * of a card whose accessible name is "Find out more".
 *
 * Nested interactive elements are invalid inside a link, so when a card needs
 * its own secondary control (SermonCard's "Listen" button over a linked card),
 * leave `href` off and keep the two as siblings.
 */

export default function Card({
  href,
  interactive,
  as: Tag = "div",
  className,
  children,
}: {
  /** Makes the whole card a link. Internal paths go through next/link. */
  href?: string;
  /**
   * Hover lift without a link — for cards whose action lives inside them.
   * Implied by `href`.
   */
  interactive?: boolean;
  /** Ignored when `href` is set. */
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const lifts = interactive || href !== undefined;

  const classes = cn(
    "rounded-card border border-hairline shadow-card transition duration-300 ease-standard",
    lifts && "hover:-translate-y-1 hover:shadow-card-hover",
    // A linked card is one focus target covering a large area, so the ring has
    // to be visible against both white and tinted surfaces.
    href &&
      "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destiny-orange focus-visible:ring-offset-2",
    className,
  );

  if (href) {
    const external = /^https?:|^mailto:|^tel:/.test(href);

    if (external) {
      return (
        <a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return <Tag className={classes}>{children}</Tag>;
}
