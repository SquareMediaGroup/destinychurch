import AnimateIn from "@/components/AnimateIn";
import {
  CHARITY_REGISTER_URL,
  COMPANY_REGISTER_URL,
  formatRegisterDate,
  type GovernanceData,
} from "@/lib/governance.server";

/**
 * Attribution and honesty about staleness.
 *
 * When a regulator's API is unreachable the page falls back to a stored
 * snapshot, and it says so here rather than presenting stored data as live —
 * on a transparency page, quietly showing stale figures would undercut the
 * whole point.
 */
export default function GovernanceSourceNote({
  sources,
  fetchedAt,
}: {
  sources: GovernanceData["sources"];
  fetchedAt: string;
}) {
  const stale: string[] = [
    ...(sources.charityCommission === "fallback"
      ? ["the Charity Commission"]
      : []),
    ...(sources.companiesHouse === "fallback" ? ["Companies House"] : []),
  ];

  return (
    <section className="bg-[#f5f7fa] py-16">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">
        <AnimateIn>
          <div className="border-t border-black/6 pt-8">
            <h2 className="mb-3 text-xl font-black text-destiny-grey">
              Where this information comes from
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-destiny-grey/70">
              This page is generated from the public registers held by the{" "}
              <a
                href={CHARITY_REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-destiny-orange underline underline-offset-4"
              >
                Charity Commission for England and Wales
              </a>{" "}
              and{" "}
              <a
                href={COMPANY_REGISTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-destiny-orange underline underline-offset-4"
              >
                Companies House
              </a>
              . It refreshes automatically once a week. The registers themselves
              are always the definitive record.
            </p>

            {stale.length > 0 && (
              <div className="mb-4 rounded-2xl bg-destiny-orange/10 px-5 py-4">
                <p className="text-sm font-bold text-destiny-orange">
                  Some details on this page are from our last stored copy because{" "}
                  {stale.join(" and ")}{" "}
                  {stale.length > 1 ? "were" : "was"} unreachable when this page
                  was last refreshed. Please check the register directly for the
                  current position.
                </p>
              </div>
            )}

            <p className="text-sm text-destiny-grey/40">
              Last refreshed:{" "}
              {formatRegisterDate(fetchedAt) ?? "unknown"}
            </p>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
