import AnimateIn from "@/components/AnimateIn";

/**
 * A row of practical facts (when / where / cost) on a single panel.
 *
 * /kids used to render these as three separate cards identical to every other
 * card grid on the page. Collapsing them into one divided panel gives the page
 * a second kind of rhythm instead of a third card row.
 */

export interface Fact {
  /** Material Symbols Rounded ligature name. */
  icon: string;
  label: string;
  value: string;
  note?: string;
}

interface Props {
  facts: Fact[];
  tone?: "light" | "muted";
}

export default function FactStrip({ facts, tone = "muted" }: Props) {
  return (
    <section className={`py-16 ${tone === "muted" ? "bg-[#f5f7fa]" : "bg-white"}`}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div
            className={`grid divide-y divide-black/[0.07] overflow-hidden rounded-3xl border border-black/[0.07] shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] sm:grid-cols-3 sm:divide-x sm:divide-y-0 ${
              tone === "muted" ? "bg-white" : "bg-[#f5f7fa]"
            }`}
          >
            {facts.map((fact) => (
              <div key={fact.label} className="p-7 lg:p-8">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    aria-hidden
                    className="material-symbols-rounded text-[20px] leading-none text-destiny-orange"
                  >
                    {fact.icon}
                  </span>
                  <p className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-grey/45">
                    {fact.label}
                  </p>
                </div>
                <p
                  style={{ fontFamily: "var(--font-roboto)" }}
                  className="text-[20px] font-semibold leading-[1.25] tracking-[-0.017em] text-destiny-grey"
                >
                  {fact.value}
                </p>
                {fact.note && (
                  <p className="mt-2 text-sm leading-relaxed text-destiny-grey/50">
                    {fact.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
