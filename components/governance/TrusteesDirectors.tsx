import AnimateIn from "@/components/AnimateIn";
import {
  formatRegisterDate,
  type Officer,
} from "@/lib/governance.server";

/**
 * Trustees and directors are published by both regulators, so republishing the
 * names here adds no disclosure. We deliberately show name and role only — the
 * APIs also return dates of birth and correspondence addresses, and none of
 * that belongs on a church website.
 */
export default function TrusteesDirectors({
  trustees,
  officers,
}: {
  trustees: string[];
  officers: Officer[];
}) {
  if (trustees.length === 0 && officers.length === 0) return null;

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Leadership
            </p>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl lg:text-5xl">
              Trustees &amp; Directors
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
              The people legally responsible for the governance of the church.
              In a charitable company the same people usually serve as both
              charity trustees and company directors.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-8 lg:grid-cols-2">
          {trustees.length > 0 && (
            <AnimateIn delay={100}>
              <div className="h-full rounded-3xl bg-[#f5f7fa] p-8">
                <div className="mb-6 flex items-center gap-3">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">
                    groups
                  </span>
                  <h3 className="text-2xl font-black text-destiny-grey">
                    Charity trustees
                  </h3>
                </div>
                <ul className="space-y-3">
                  {trustees.map((name) => (
                    <li
                      key={name}
                      className="border-t border-black/6 pt-3 text-sm font-bold text-destiny-grey"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>
          )}

          {officers.length > 0 && (
            <AnimateIn delay={200}>
              <div className="h-full rounded-3xl bg-[#f5f7fa] p-8">
                <div className="mb-6 flex items-center gap-3">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">
                    badge
                  </span>
                  <h3 className="text-2xl font-black text-destiny-grey">
                    Company directors
                  </h3>
                </div>
                <ul className="space-y-3">
                  {officers.map((officer) => {
                    const appointed = formatRegisterDate(officer.appointedOn);
                    return (
                      <li
                        key={`${officer.name}-${officer.appointedOn ?? ""}`}
                        className="border-t border-black/6 pt-3"
                      >
                        <p className="text-sm font-bold text-destiny-grey">
                          {officer.name}
                        </p>
                        <p className="text-xs text-destiny-grey/50">
                          {officer.role}
                          {appointed ? ` — appointed ${appointed}` : ""}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </AnimateIn>
          )}
        </div>
      </div>
    </section>
  );
}
