import AnimateIn from "@/components/AnimateIn";
import { formatRegisterDate, type Officer } from "@/lib/governance.server";

/** Strip honorifics and casing so "Pastor Jonathan Mark Harris" and
 *  "Jonathan Mark Harris" are recognised as the same person. */
function identity(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(pastor|rev(erend)?|dr|mr|mrs|ms|miss|sir|dame)\b\.?/g, "")
    .replace(/[^a-z]/g, "");
}

function Panel({
  icon,
  title,
  delay,
  children,
}: {
  icon: string;
  title: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <AnimateIn delay={delay}>
      <div className="h-full rounded-3xl bg-[#f5f7fa] p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="material-symbols-rounded text-2xl text-destiny-orange">
            {icon}
          </span>
          <h3 className="text-2xl font-black text-destiny-grey">{title}</h3>
        </div>
        {children}
      </div>
    </AnimateIn>
  );
}

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

  // In a charitable company the trustees and the directors are usually the very
  // same people, and rendering two identical columns reads as a bug. When the
  // two sets match, collapse to a single list and say so explicitly.
  const trusteeIds = new Set(trustees.map(identity));
  const officerIds = new Set(officers.map((o) => identity(o.name)));
  const sameBoard =
    trustees.length > 0 &&
    officers.length > 0 &&
    trusteeIds.size === officerIds.size &&
    [...trusteeIds].every((id) => officerIds.has(id));

  // Appointment dates only exist on the Companies House side.
  const appointedFor = (name: string) =>
    officers.find((o) => identity(o.name) === identity(name))?.appointedOn ??
    null;

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
              {sameBoard
                ? "The people legally responsible for the governance of the church. Each of them serves as both a charity trustee and a company director."
                : "The people legally responsible for the governance of the church. In a charitable company the same people usually serve as both charity trustees and company directors."}
            </p>
          </div>
        </AnimateIn>

        {sameBoard ? (
          <AnimateIn delay={100}>
            <div className="rounded-3xl bg-[#f5f7fa] p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="material-symbols-rounded text-2xl text-destiny-orange">
                  groups
                </span>
                <h3 className="text-2xl font-black text-destiny-grey">
                  Charity trustees and company directors
                </h3>
              </div>
              <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {trustees.map((name) => {
                  const appointed = formatRegisterDate(appointedFor(name));
                  return (
                    <li
                      key={name}
                      className="border-t border-black/6 py-3"
                    >
                      <p className="text-sm font-bold text-destiny-grey">
                        {name}
                      </p>
                      {appointed && (
                        <p className="text-xs text-destiny-grey/50">
                          Appointed {appointed}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </AnimateIn>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {trustees.length > 0 && (
              <Panel icon="groups" title="Charity trustees" delay={100}>
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
              </Panel>
            )}

            {officers.length > 0 && (
              <Panel icon="badge" title="Company directors" delay={200}>
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
              </Panel>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
