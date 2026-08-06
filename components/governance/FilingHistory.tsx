import AnimateIn from "@/components/AnimateIn";
import {
  CHARITY_REGISTER_URL,
  formatRegisterDate,
  type AccountsSubmission,
  type Filing,
} from "@/lib/governance.server";

export default function FilingHistory({
  filings,
  submissions,
}: {
  filings: Filing[];
  submissions: AccountsSubmission[];
}) {
  if (filings.length === 0 && submissions.length === 0) return null;

  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Compliance
            </p>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl lg:text-5xl">
              Filings &amp; Returns
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
              What we have filed with each regulator, and when. Every document
              is available in full on the official register.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-8 lg:grid-cols-2">
          {filings.length > 0 && (
            <AnimateIn delay={100}>
              <div className="h-full rounded-3xl bg-[#f5f7fa] p-6 sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">
                    description
                  </span>
                  <h3 className="text-2xl font-black text-destiny-grey">
                    Companies House filings
                  </h3>
                </div>
                <ul className="space-y-4">
                  {filings.map((filing, i) => (
                    <li
                      key={`${filing.date ?? "undated"}-${i}`}
                      className="border-t border-black/6 pt-4"
                    >
                      <p className="text-sm font-bold text-destiny-grey">
                        {filing.description}
                      </p>
                      <p className="mt-1 text-xs text-destiny-grey/50">
                        {formatRegisterDate(filing.date) ?? "Date not recorded"}
                        {filing.category ? ` — ${filing.category}` : ""}
                      </p>
                      {filing.documentUrl && (
                        <a
                          href={filing.documentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-destiny-orange underline underline-offset-4 transition hover:text-destiny-orange-dark"
                        >
                          View document
                          <span
                            className="material-symbols-rounded text-sm"
                            aria-hidden="true"
                          >
                            open_in_new
                          </span>
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimateIn>
          )}

          {submissions.length > 0 && (
            <AnimateIn delay={200}>
              <div className="h-full rounded-3xl bg-[#f5f7fa] p-6 sm:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">
                    event_available
                  </span>
                  <h3 className="text-2xl font-black text-destiny-grey">
                    Charity annual returns
                  </h3>
                </div>
                <ul className="space-y-4">
                  {submissions.map((submission) => (
                    <li
                      key={submission.financialYearEnd}
                      className="border-t border-black/6 pt-4"
                    >
                      <p className="text-sm font-bold text-destiny-grey">
                        Year ending{" "}
                        {formatRegisterDate(submission.financialYearEnd) ??
                          submission.financialYearEnd}
                      </p>
                      <p className="mt-1 text-xs text-destiny-grey/50">
                        Annual return received:{" "}
                        {formatRegisterDate(submission.annualReturnReceived) ??
                          "Not recorded"}
                      </p>
                      <p className="text-xs text-destiny-grey/50">
                        Accounts received:{" "}
                        {formatRegisterDate(submission.accountsReceived) ??
                          "Not recorded"}
                      </p>
                    </li>
                  ))}
                </ul>
                <a
                  href={CHARITY_REGISTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-1 text-sm font-bold text-destiny-orange underline underline-offset-4 transition hover:text-destiny-orange-dark"
                >
                  View accounts on the register
                  <span
                    className="material-symbols-rounded text-base"
                    aria-hidden="true"
                  >
                    open_in_new
                  </span>
                </a>
              </div>
            </AnimateIn>
          )}
        </div>
      </div>
    </section>
  );
}
