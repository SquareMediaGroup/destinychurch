import AnimateIn from "@/components/AnimateIn";

/**
 * The "why join / what we're about" card grid, shared by /child-dedication,
 * /young-adults and /connect — which until now each carried their own
 * byte-identical copy of it.
 *
 * The old card led with an orange-tinted rounded square holding a Material
 * icon; that treatment was the most dated thing on these pages. Here the icon
 * sits inline with the title and an oversized index numeral does the visual
 * work, with the card shell borrowed from events/EventCard (hairline border,
 * two-layer shadow, hover lift) so these read as siblings of the newest work
 * on the site.
 *
 * Note the single AnimateIn around the whole grid: AnimateIn renders a plain
 * <div>, so wrapping individual cells would break the grid layout.
 */

export interface Feature {
  /** Material Symbols Rounded ligature name. */
  icon: string;
  title: string;
  body: string;
}

interface Props {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  items: Feature[];
  columns?: 3 | 4;
  tone?: "light" | "muted";
}

export default function FeatureGrid({
  eyebrow,
  heading,
  subheading,
  items,
  columns = 4,
  tone = "muted",
}: Props) {
  const cols = columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4";

  return (
    <section className={`py-20 ${tone === "muted" ? "bg-[#f5f7fa]" : "bg-white"}`}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {(eyebrow || heading || subheading) && (
          <AnimateIn>
            <div className="mb-12 text-center">
              {eyebrow && (
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                  {eyebrow}
                </p>
              )}
              {heading && (
                <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl">
                  {heading}
                </h2>
              )}
              {subheading && (
                <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
                  {subheading}
                </p>
              )}
            </div>
          </AnimateIn>
        )}

        <AnimateIn delay={100}>
          <div className={`grid gap-6 sm:grid-cols-2 ${cols} lg:gap-7`}>
            {items.map((item, i) => (
              <div
                key={item.title}
                className={`group relative flex flex-col overflow-hidden rounded-[20px] border border-black/[0.07] p-7 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(16,24,40,.05),0_16px_36px_-12px_rgba(16,24,40,.16)] ${
                  tone === "muted" ? "bg-white" : "bg-[#f5f7fa]"
                }`}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute right-5 top-4 text-4xl font-black leading-none text-destiny-orange/20 transition-colors duration-300 group-hover:text-destiny-orange/30"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  aria-hidden
                  className="material-symbols-rounded mb-4 text-[28px] leading-none text-destiny-orange"
                >
                  {item.icon}
                </span>
                <h3
                  style={{ fontFamily: "var(--font-roboto)" }}
                  className="mb-2 pr-10 text-[19px] font-semibold leading-[1.25] tracking-[-0.017em] text-destiny-grey"
                >
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-destiny-grey/60">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
