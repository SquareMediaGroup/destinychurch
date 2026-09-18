import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

// The site's button styles, which until now were copy-pasted Tailwind strings.
// A survey of app/ and components/ turned up ~60 near-identical variations of
// the orange pill alone — same intent, drifting padding and shadow. The sets
// below are the shapes that actually recurred, not a fresh design.
//
// Two things vary independently, so they are separate props:
//   shape — "pill" is the public site, "soft" (rounded-xl) is /admin
//   variant — the colour treatment
//
// Anything genuinely one-off should still be a plain <button>; this is for the
// repeated cases. Extra classes merge in via className.

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "accentOutline"
  | "onDark"
  | "glass";
type Shape = "pill" | "soft" | "card";
type Size = "xs" | "sm" | "md" | "lg" | "xl" | "cta" | "icon";

const BASE =
  "inline-flex items-center justify-center gap-2 font-bold transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";

const SHAPES: Record<Shape, string> = {
  pill: "rounded-full",
  soft: "rounded-xl",
  // The larger icon+label CTAs (Give Online, Text to Give) — rounder corners
  // and a heavier shadow than the pill buttons.
  card: "rounded-2xl",
};

// Each size is a padding cluster that already exists in the codebase, so
// adopting Button does not move anything by a few pixels. There are five
// because there are five real clusters — resist collapsing them by overriding
// padding through className: `cn` does not resolve Tailwind conflicts, so
// `px-7` beating the `px-6` from a size depends on stylesheet order rather
// than anything guaranteed. Add a size instead.
const SIZES: Record<Size, string> = {
  xs: "px-4 py-2 text-xs",
  sm: "px-6 py-2.5 text-sm", // the /admin default
  md: "px-6 py-3 text-sm",
  lg: "px-7 py-3 text-sm",
  xl: "px-7 py-3.5 text-sm", // hero CTAs
  cta: "px-7 py-4 text-sm", // shape="card" icon+label CTAs
  // Icon-only. Square, and 44px so it clears the minimum touch target — the
  // hand-rolled carousel arrows this replaces were 32px.
  icon: "h-11 w-11 p-0 text-xl",
};

// `soft` is the admin chrome, which sits on white cards and uses a tighter
// shadow than the public site's hero buttons.
const VARIANTS: Record<Variant, Record<Shape, string>> = {
  primary: {
    pill: "bg-destiny-orange text-white shadow-lg shadow-destiny-orange/25 hover:brightness-110 focus-visible:ring-destiny-orange",
    soft: "bg-destiny-orange text-white shadow-sm shadow-destiny-orange/20 hover:brightness-110 focus-visible:ring-destiny-orange",
    card: "bg-destiny-orange text-white shadow-xl shadow-destiny-orange/30 hover:brightness-110 focus-visible:ring-destiny-orange",
  },
  secondary: {
    pill: "bg-destiny-grey text-white hover:brightness-110 focus-visible:ring-destiny-grey",
    soft: "bg-destiny-grey text-white hover:brightness-110 focus-visible:ring-destiny-grey",
    card: "bg-destiny-grey text-white shadow-xl shadow-destiny-grey/30 hover:brightness-110 focus-visible:ring-destiny-grey",
  },
  outline: {
    pill: "border border-black/10 text-destiny-grey hover:border-black/25 hover:bg-black/[0.03] focus-visible:ring-destiny-orange",
    soft: "border border-black/10 text-destiny-grey hover:border-black/25 hover:bg-black/[0.03] focus-visible:ring-destiny-orange",
    card: "border border-black/10 text-destiny-grey hover:border-black/25 hover:bg-black/[0.03] focus-visible:ring-destiny-orange",
  },
  // The public site's secondary CTA on light backgrounds: an orange outline
  // that fills on hover. Distinct from `outline`, which is a neutral hairline
  // for tertiary actions. This shipped in three places as a pasted class string
  // before it existed here, which is why `outline` kept getting passed over.
  accentOutline: {
    pill: "border-2 border-destiny-orange text-destiny-orange hover:bg-destiny-orange hover:text-white focus-visible:ring-destiny-orange",
    soft: "border-2 border-destiny-orange text-destiny-orange hover:bg-destiny-orange hover:text-white focus-visible:ring-destiny-orange",
    card: "border-2 border-destiny-orange text-destiny-orange hover:bg-destiny-orange hover:text-white focus-visible:ring-destiny-orange",
  },
  // For hero sections and other dark photography backgrounds.
  onDark: {
    pill: "border-2 border-white/30 text-white hover:border-white/60 hover:bg-white/10 focus-visible:ring-white",
    soft: "border-2 border-white/30 text-white hover:border-white/60 hover:bg-white/10 focus-visible:ring-white",
    card: "border-2 border-white/30 text-white hover:border-white/60 hover:bg-white/10 focus-visible:ring-white",
  },
  glass: {
    pill: "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 focus-visible:ring-white",
    soft: "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 focus-visible:ring-white",
    card: "bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 focus-visible:ring-white",
  },
};

export function buttonClasses({
  variant = "primary",
  shape = "pill",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleProps & { className?: string } = {}): string {
  return cn(
    BASE,
    SHAPES[shape],
    SIZES[size],
    VARIANTS[variant][shape],
    fullWidth && "w-full",
    className,
  );
}

interface ButtonStyleProps {
  variant?: Variant;
  shape?: Shape;
  size?: Size;
  fullWidth?: boolean;
}

type ButtonProps = ButtonStyleProps &
  ComponentPropsWithoutRef<"button"> & {
    /** Render as a link. Internal paths go through next/link. */
    href?: string;
    /**
     * Show a spinner and block further clicks. The label stays in place and
     * keeps its width so the button does not resize mid-submit, and
     * `aria-busy` tells a screen reader something is in flight — otherwise a
     * disabled button is just silently unresponsive.
     */
    loading?: boolean;
    children: ReactNode;
  };

/**
 * Sized in `em` so one spinner works at every button size, and drawn with
 * `currentColor` so it inherits the variant's text colour. Hidden from
 * assistive tech: `aria-busy` on the button already carries the meaning.
 */
function Spinner() {
  return (
    <svg
      className="h-[1.1em] w-[1.1em] shrink-0 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Button({
  variant,
  shape,
  size,
  fullWidth,
  className,
  href,
  loading,
  children,
  ...rest
}: ButtonProps) {
  const classes = buttonClasses({ variant, shape, size, fullWidth, className });

  if (href) {
    const external = /^https?:|^mailto:|^tel:/.test(href);
    const anchorProps = rest as ComponentPropsWithoutRef<"a">;

    if (external) {
      return (
        <a
          href={href}
          className={classes}
          target="_blank"
          rel="noopener noreferrer"
          {...anchorProps}
        >
          {children}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  return (
    <button
      {...rest}
      className={classes}
      aria-busy={loading || undefined}
      disabled={loading || rest.disabled}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
