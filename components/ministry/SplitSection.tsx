import AnimateIn from "@/components/AnimateIn";

/**
 * The image-and-copy split used all over the ministry pages.
 *
 * The split is 7/5 rather than the old even 50/50 — the asymmetry is what
 * stops every section on these pages reading as the same block flipped left
 * and right. `reverse` swaps the columns via lg:order-* so the JSX stays in
 * reading order for screen readers regardless of the visual arrangement.
 */

type Tone = "light" | "muted" | "dark";

interface Props {
  eyebrow?: string;
  title: string;
  /** Body copy and any CTAs. */
  children: React.ReactNode;
  /** Usually an <ImageMosaic /> or a single framed image. */
  media: React.ReactNode;
  /** Put the media on the right (default is media left on the copy's lead). */
  reverse?: boolean;
  tone?: Tone;
  /** Give the media the wider column instead of the copy. */
  wideMedia?: boolean;
}

const DARK_GRADIENT = "linear-gradient(135deg, #363f48 0%, #242e37 100%)";

export default function SplitSection({
  eyebrow,
  title,
  children,
  media,
  reverse = false,
  tone = "light",
  wideMedia = false,
}: Props) {
  const dark = tone === "dark";
  const copySpan = wideMedia ? "lg:col-span-5" : "lg:col-span-7";
  const mediaSpan = wideMedia ? "lg:col-span-7" : "lg:col-span-5";

  return (
    <section
      className={`py-20 ${tone === "muted" ? "bg-[#f5f7fa]" : dark ? "" : "bg-white"}`}
      style={dark ? { background: DARK_GRADIENT } : undefined}
    >
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <AnimateIn
            className={`${copySpan} ${reverse ? "lg:order-2" : "lg:order-1"}`}
          >
            {eyebrow && (
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                {eyebrow}
              </p>
            )}
            <h2
              className={`mb-5 text-3xl font-black md:text-4xl ${dark ? "text-white" : "text-destiny-grey"}`}
            >
              {title}
            </h2>
            <div
              className={`space-y-4 text-base leading-relaxed ${dark ? "text-white/70" : "text-destiny-grey/70"}`}
            >
              {children}
            </div>
          </AnimateIn>
          <AnimateIn
            delay={100}
            className={`${mediaSpan} ${reverse ? "lg:order-1" : "lg:order-2"}`}
          >
            {media}
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
