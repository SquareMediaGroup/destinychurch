import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import AnimateIn from "@/components/AnimateIn";
import Icon from "@/components/ui/Icon";

/**
 * The hero at the top of an inner page.
 *
 * This is `components/ministry/MinistryHero.tsx` generalised, because that was
 * already the best hero on the site and only five pages could use it. The rest
 * were on an older idiom: a CSS `background-image` (so the page's LCP element
 * goes through neither next/image nor `priority`), a fixed `py-[12rem]` or
 * `py-[10rem]` that does not step down on mobile — a 384px band of padding on a
 * 375px-wide phone — and `text-5xl font-black md:text-6xl lg:text-7xl` Arial.
 *
 * Nine pages shared that older ramp, `MinistryHero`'s five had a different one,
 * /about had a third and /alpha a fourth. Consolidating on this one keeps the
 * treatment that was chosen most recently and most deliberately:
 *
 *  - sharp photo through next/image with `priority` and `sizes="100vw"`
 *  - two scrim layers — a directional gradient for depth plus a flat wash, so
 *    centred text clears contrast wherever it falls on the image
 *  - Roboto semibold with negative tracking rather than Arial black
 *  - `chips` for the facts that otherwise get crammed into the eyebrow
 *
 * `size` exists because a hero is not always the same weight of thing: a
 * campaign page wants the full-height statement, a utility page like /contact
 * wants a header. Both are the same component so they cannot drift.
 */

export interface HeroChip {
  /** Material Symbols Rounded ligature name. */
  icon: string;
  label: string;
}

const SIZES = {
  /** Utility pages — /contact, /jobs. A header, not a statement. */
  sm: "min-h-[280px] sm:min-h-[340px]",
  /** The default. */
  md: "min-h-[440px] sm:min-h-[540px] lg:min-h-[620px]",
  /** Campaign and course landing pages. */
  lg: "min-h-[520px] sm:min-h-[620px] lg:min-h-[720px]",
} as const;

export default function PageHero({
  image,
  imageAlt,
  eyebrow,
  title,
  subtitle,
  chips,
  actions,
  size = "md",
  objectPosition = "center",
  className,
}: {
  image: string;
  /**
   * Empty string marks the photo as decorative, which is right when the
   * heading already describes it. Say something specific otherwise.
   */
  imageAlt: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  chips?: HeroChip[];
  actions?: ReactNode;
  size?: keyof typeof SIZES;
  /** CSS object-position for framing, e.g. "top" for group shots. */
  objectPosition?: string;
  className?: string;
}) {
  return (
    <div className="px-4 py-8 lg:px-8">
      <section
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-shell",
          SIZES[size],
          className,
        )}
      >
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition }}
          aria-hidden={imageAlt === "" ? true : undefined}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/35 to-black/70" />
        <div className="absolute inset-0 bg-black/15" />

        <div className="relative w-full px-6 py-20 text-center sm:py-24">
          <AnimateIn>
            <div className="mx-auto max-w-3xl">
              {eyebrow && (
                <p className="mb-4 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                  {eyebrow}
                </p>
              )}

              {/* Inline font-family, not a utility: the `h1,h2,h3 { Arial }`
                  rule in @layer base outranks every Tailwind font-* class. */}
              <h1
                style={{ fontFamily: "var(--font-roboto)" }}
                className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[52px] lg:text-[64px]"
              >
                {title}
              </h1>

              {subtitle && (
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-on-dark-subtle md:text-lg">
                  {subtitle}
                </p>
              )}

              {chips && chips.length > 0 && (
                <ul className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
                  {chips.map((chip) => (
                    <li
                      key={chip.label}
                      className="glass glass-sm glass-pill inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12.5px] font-semibold text-white"
                    >
                      <Icon
                        name={chip.icon}
                        className="text-[16px] leading-none text-destiny-orange"
                      />
                      {chip.label}
                    </li>
                  ))}
                </ul>
              )}

              {actions && (
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  {actions}
                </div>
              )}
            </div>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
