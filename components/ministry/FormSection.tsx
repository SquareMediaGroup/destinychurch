import AnimateIn from "@/components/AnimateIn";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";

/**
 * The dark ChurchSuite form band, shared by /child-dedication and /connect.
 *
 * Same gradient the pages already used, plus a soft radial glow so it isn't a
 * flat slab, and the embed now sits inside a white rounded panel instead of
 * having shadow-2xl applied straight to a bare iframe.
 *
 * ChurchSuiteEmbed is untouched — it keeps its own cookie-consent gate and
 * renders the "cookies required" fallback in place of the iframe when media
 * consent hasn't been given.
 */

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
  src: string;
  formTitle: string;
  height: number;
}

export default function FormSection({
  eyebrow,
  title,
  subtitle,
  src,
  formTitle,
  height,
}: Props) {
  return (
    <section
      className="relative overflow-hidden py-20"
      style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 55% at 50% 0%, rgba(245,128,33,0.16) 0%, rgba(245,128,33,0) 70%)",
        }}
      />
      <div className="relative mx-auto max-w-4xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              {eyebrow}
            </p>
            <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mx-auto max-w-xl text-base leading-relaxed text-white/60">
                {subtitle}
              </p>
            )}
          </div>
        </AnimateIn>
        <AnimateIn delay={100}>
          <div className="overflow-hidden rounded-3xl bg-white p-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.45)] sm:p-3">
            <ChurchSuiteEmbed
              src={src}
              title={formTitle}
              height={height}
              className="rounded-2xl"
            />
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
