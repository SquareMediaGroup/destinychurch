import AnimateIn from "@/components/AnimateIn";

/**
 * Age-banded ministry groups — /kids classes and /youth key stages.
 *
 * Those two pages solved the same problem twice, differently: /youth had a
 * solid coloured header block with a ghosted icon, /kids had an icon tile
 * beside the copy. The /youth treatment was the stronger one and is the basis
 * here, so both pages now speak the same language.
 *
 * Colours come from the destiny-* theme tokens rather than the inline hex
 * strings the pages used to carry (which were those same tokens, copied by
 * value).
 */

export type GroupTone = "orange" | "blue" | "green" | "purple";

export interface AgeGroup {
  name: string;
  ages: string;
  tone: GroupTone;
  /** Material Symbols Rounded ligature name. */
  icon: string;
  description: string;
  /** Optional footer fact, e.g. the room the group meets in. */
  detail?: string;
  detailIcon?: string;
}

interface Props {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  groups: AgeGroup[];
  tone?: "light" | "muted";
}

const BAND: Record<GroupTone, string> = {
  orange: "bg-destiny-orange",
  blue: "bg-destiny-blue",
  green: "bg-destiny-green",
  purple: "bg-destiny-purple",
};

export default function AgeGroupCards({
  eyebrow,
  heading,
  subheading,
  groups,
  tone = "muted",
}: Props) {
  // Two-up reads better for four cards, three-up for three.
  const cols = groups.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2";

  return (
    <section className={`py-20 ${tone === "muted" ? "bg-[#f5f7fa]" : "bg-white"}`}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-12 text-center">
            {eyebrow && (
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                {eyebrow}
              </p>
            )}
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl">
              {heading}
            </h2>
            {subheading && (
              <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
                {subheading}
              </p>
            )}
          </div>
        </AnimateIn>

        <AnimateIn delay={100}>
          <div className={`grid gap-6 sm:grid-cols-2 ${cols} lg:gap-7`}>
            {groups.map((group) => (
              <div
                key={group.name}
                className={`flex flex-col overflow-hidden rounded-[20px] border border-black/[0.07] shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_2px_4px_rgba(16,24,40,.05),0_16px_36px_-12px_rgba(16,24,40,.16)] ${
                  tone === "muted" ? "bg-white" : "bg-[#f5f7fa]"
                }`}
              >
                <div
                  className={`relative flex h-32 items-end overflow-hidden p-6 ${BAND[group.tone]}`}
                >
                  <span
                    aria-hidden
                    className="material-symbols-rounded pointer-events-none absolute -right-2 -top-1 text-[92px] leading-none text-white/15"
                  >
                    {group.icon}
                  </span>
                  <div className="relative">
                    <p className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-white/75">
                      {group.ages}
                    </p>
                    <p
                      style={{ fontFamily: "var(--font-roboto)" }}
                      className="mt-0.5 text-[26px] font-semibold leading-[1.1] tracking-[-0.022em] text-white"
                    >
                      {group.name}
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <p className="text-sm leading-relaxed text-destiny-grey/70">
                    {group.description}
                  </p>
                  {group.detail && (
                    <div className="mt-auto border-t border-black/[0.07] pt-4">
                      <dl className="flex items-baseline gap-2">
                        <dt className="text-xs font-bold uppercase tracking-wide text-destiny-grey/40">
                          Where
                        </dt>
                        <dd className="text-sm font-semibold text-destiny-grey/80">
                          {group.detail}
                        </dd>
                      </dl>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
