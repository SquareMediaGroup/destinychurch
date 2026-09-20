import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import AnimateIn from "@/components/AnimateIn";
import { FONT_ROBOTO } from "@/components/blocks/tokens";

/**
 * The inset call-to-action banner: blurred photo, dark scrim, copy on the left,
 * stacked buttons on the right.
 *
 * The idiom `scale-105 … blur-sm` behind a `from-black/80 via-black/60` scrim
 * is pasted into eight files, and four of them are the same component with
 * different words: `WorshipWithUsSection`, `ConnectGroupsBanner`,
 * `TogetherMissionSection`, and the Courses banner on /whats-on. They had
 * already drifted — the ghost button's border is `white/30` in one,
 * `white/40` in another and `white/50` in a third.
 *
 * The blur is deliberate: the photo is atmosphere, not information, so it is
 * softened to keep the text legible. That is also why `alt` is not a prop —
 * a blurred background image behind a heading has nothing to tell a screen
 * reader, so it is always decorative here.
 */

export default function MediaBanner({
  image,
  title,
  body,
  actions,
  align = "row",
  className,
}: {
  image: string;
  title: ReactNode;
  body?: ReactNode;
  /** Usually a couple of `<Button>`s. */
  actions?: ReactNode;
  /** `row` puts actions beside the copy on desktop; `stack` keeps them below. */
  align?: "row" | "stack";
  className?: string;
}) {
  return (
    <div className={cn("px-4 py-8 lg:px-8", className)}>
      <section className="relative overflow-hidden rounded-shell">
        <Image
          src={image}
          alt=""
          aria-hidden="true"
          fill
          sizes="100vw"
          quality={80}
          loading="lazy"
          className="scale-105 object-cover object-center blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/65 to-black/45" />

        <div
          className={cn(
            "relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:gap-8 sm:py-16 lg:px-8",
            align === "row" &&
              "md:flex-row md:items-center md:justify-between",
          )}
        >
          <AnimateIn className="max-w-xl">
            <h2
              className="text-2xl font-black text-white sm:text-3xl md:text-4xl"
              style={{ fontFamily: FONT_ROBOTO }}
            >
              {title}
            </h2>
            {body && (
              <p className="mt-3 text-sm leading-relaxed text-on-dark-subtle sm:mt-4 sm:text-base">
                {body}
              </p>
            )}
          </AnimateIn>

          {actions && (
            <AnimateIn delay={150} className="flex flex-col gap-3">
              {actions}
            </AnimateIn>
          )}
        </div>
      </section>
    </div>
  );
}
