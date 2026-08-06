import AnimateIn from "@/components/AnimateIn";
import {
  formatCurrency,
  formatRegisterDate,
  type FinancialYear,
} from "@/lib/governance.server";

/** Bars are scaled against the largest figure across all years, so the
 *  years stay visually comparable to each other rather than each to itself. */
function scale(value: number | null, max: number): number {
  if (value === null || max <= 0) return 0;
  return Math.max(2, Math.round((value / max) * 100));
}

export default function FinancialHistory({
  financials,
}: {
  financials: FinancialYear[];
}) {
  if (financials.length === 0) return null;

  const max = Math.max(
    ...financials.flatMap((year) =>
      [year.income, year.expenditure].filter(
        (v): v is number => v !== null && v > 0,
      ),
    ),
    0,
  );

  const latest = financials[0];

  return (
    <section className="bg-[#f5f7fa] py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Stewardship
            </p>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl lg:text-5xl">
              Financial History
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
              Income and expenditure as reported to the Charity Commission in
              our annual returns, covering the last five financial years on the
              register.
            </p>
          </div>
        </AnimateIn>

        {latest && (
          <div className="mb-10 grid gap-6 sm:grid-cols-2">
            <AnimateIn delay={100}>
              <div className="rounded-3xl bg-white p-8">
                <div className="mb-4 flex items-center gap-3">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">
                    trending_up
                  </span>
                  <h3 className="text-xl font-black text-destiny-grey">
                    Total income
                  </h3>
                </div>
                <p className="text-4xl font-black text-destiny-grey">
                  {formatCurrency(latest.income) ?? "Not reported"}
                </p>
                <p className="text-sm text-destiny-grey/50">
                  Year ending{" "}
                  {formatRegisterDate(latest.financialYearEnd) ??
                    latest.financialYearEnd}
                </p>
              </div>
            </AnimateIn>

            <AnimateIn delay={150}>
              <div className="rounded-3xl bg-white p-8">
                <div className="mb-4 flex items-center gap-3">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">
                    payments
                  </span>
                  <h3 className="text-xl font-black text-destiny-grey">
                    Total expenditure
                  </h3>
                </div>
                <p className="text-4xl font-black text-destiny-grey">
                  {formatCurrency(latest.expenditure) ?? "Not reported"}
                </p>
                <p className="text-sm text-destiny-grey/50">
                  Year ending{" "}
                  {formatRegisterDate(latest.financialYearEnd) ??
                    latest.financialYearEnd}
                </p>
              </div>
            </AnimateIn>
          </div>
        )}

        <AnimateIn delay={200}>
          <div className="rounded-3xl bg-white p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-destiny-grey/50">
                <span className="h-2 w-6 rounded-full bg-destiny-orange" />
                Income
              </span>
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-destiny-grey/50">
                <span className="h-2 w-6 rounded-full bg-destiny-grey" />
                Expenditure
              </span>
            </div>

            <div className="space-y-7">
              {financials.map((year) => {
                const label =
                  formatRegisterDate(year.financialYearEnd) ??
                  year.financialYearEnd;
                return (
                  <div key={year.financialYearEnd}>
                    <p className="mb-3 text-sm font-black text-destiny-grey">
                      Year ending {label}
                    </p>

                    <div className="mb-2">
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-destiny-grey/60">Income</span>
                        <span className="font-bold text-destiny-grey">
                          {formatCurrency(year.income) ?? "Not reported"}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#f5f7fa]">
                        <div
                          className="h-full rounded-full bg-destiny-orange"
                          style={{ width: `${scale(year.income, max)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-destiny-grey/60">
                          Expenditure
                        </span>
                        <span className="font-bold text-destiny-grey">
                          {formatCurrency(year.expenditure) ?? "Not reported"}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#f5f7fa]">
                        <div
                          className="h-full rounded-full bg-destiny-grey"
                          style={{ width: `${scale(year.expenditure, max)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </AnimateIn>

        <AnimateIn delay={250}>
          <div className="mt-8 rounded-3xl border-2 border-destiny-orange/20 bg-destiny-orange/5 p-6 text-center">
            <p className="text-sm font-bold text-destiny-grey">
              <span
                className="material-symbols-rounded mr-2 inline-block align-middle text-destiny-orange"
                aria-hidden="true"
              >
                info
              </span>
              Full annual reports and audited accounts are published on the
              Charity Commission register, and are also available from the
              church office on request.
            </p>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
