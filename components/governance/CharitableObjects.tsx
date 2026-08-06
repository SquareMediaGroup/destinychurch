import AnimateIn from "@/components/AnimateIn";
import type { CharityDetails } from "@/lib/governance.server";

export default function CharitableObjects({
  details,
}: {
  details: CharityDetails;
}) {
  const hasText = Boolean(details.objects || details.activities);
  const hasAreas = details.areasOfOperation.length > 0;
  // Nothing verified to show — better an absent section than an empty heading.
  if (!hasText && !hasAreas) return null;

  return (
    <section className="bg-[#f5f7fa] py-20">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <AnimateIn>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
            Purpose
          </p>
          <h2 className="mb-8 text-3xl font-black text-destiny-grey md:text-4xl">
            What we exist to do
          </h2>
        </AnimateIn>

        {details.objects && (
          <AnimateIn delay={100}>
            <div className="mb-8 border-t border-black/6 pt-8">
              <h3 className="mb-3 text-xl font-black text-destiny-grey">
                Charitable objects
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-destiny-grey/70">
                {details.objects}
              </p>
            </div>
          </AnimateIn>
        )}

        {details.activities && (
          <AnimateIn delay={150}>
            <div className="mb-8 border-t border-black/6 pt-8">
              <h3 className="mb-3 text-xl font-black text-destiny-grey">
                How we carry them out
              </h3>
              <p className="whitespace-pre-line text-sm leading-relaxed text-destiny-grey/70">
                {details.activities}
              </p>
            </div>
          </AnimateIn>
        )}

        {hasAreas && (
          <AnimateIn delay={200}>
            <div className="border-t border-black/6 pt-8">
              <h3 className="mb-4 text-xl font-black text-destiny-grey">
                Where we operate
              </h3>
              <ul className="flex flex-wrap gap-2">
                {details.areasOfOperation.map((area) => (
                  <li
                    key={area}
                    className="rounded-full bg-white px-4 py-2 text-sm font-bold text-destiny-grey/70"
                  >
                    {area}
                  </li>
                ))}
              </ul>
            </div>
          </AnimateIn>
        )}
      </div>
    </section>
  );
}
