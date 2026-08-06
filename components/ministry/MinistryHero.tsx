import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

/**
 * The shared hero for the ministry pages (/kids, /youth, /young-adults,
 * /connect, /child-dedication).
 *
 * Replaces the blurred-CSS-background hero that used to be copy-pasted into
 * each of those pages. Two things changed and both matter:
 *
 *  - the photo is sharp and goes through next/image with `priority`, so it is
 *    actually optimised and prioritised as the LCP element (the old CSS
 *    background could be neither), and the photography reads instead of being
 *    mush behind a black slab;
 *  - `chips` carry the schedule/age facts that /kids and /youth used to cram
 *    into the eyebrow. They're what stops the five heroes looking identical.
 *
 * The inset rounded-card shell is deliberate — it matches WorshipWithUsSection
 * and whats-on/WhatsOnHero, so these pages still open the way the rest of the
 * site does.
 */

export interface HeroChip {
  /** Material Symbols Rounded ligature name. */
  icon: string;
  label: string;
}

interface Props {
  image: string;
  imageAlt: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  chips?: HeroChip[];
  actions?: React.ReactNode;
  /** CSS object-position for framing, e.g. "top" for group shots. */
  objectPosition?: string;
}

export default function MinistryHero({
  image,
  imageAlt,
  eyebrow,
  title,
  subtitle,
  chips,
  actions,
  objectPosition = "center",
}: Props) {
  return (
    <div className="px-4 pt-8 pb-8 lg:px-8">
      <section className="relative flex min-h-[440px] items-center justify-center overflow-hidden rounded-3xl sm:min-h-[540px] lg:min-h-[620px]">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition }}
        />
        {/* Two layers: a directional gradient for depth, plus a flat wash so
            the centred text clears contrast wherever it lands on the photo. */}
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
              <h1
                style={{ fontFamily: "var(--font-roboto)" }}
                className="text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[52px] lg:text-[64px]"
              >
                {title}
              </h1>
              {subtitle && (
                <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/75 md:text-lg">
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
                      <span
                        aria-hidden
                        className="material-symbols-rounded text-[16px] leading-none text-destiny-orange"
                      >
                        {chip.icon}
                      </span>
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
