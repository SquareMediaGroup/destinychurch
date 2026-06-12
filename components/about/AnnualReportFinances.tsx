import AnimateIn from "@/components/AnimateIn";

const income = [
  { category: "Tithes & Offerings", amount: "£145,000", percentage: 72 },
  { category: "Gift Aid", amount: "£28,000", percentage: 14 },
  { category: "Events & Fundraising", amount: "£18,000", percentage: 9 },
  { category: "Other Income", amount: "£10,000", percentage: 5 },
];

const expenses = [
  { category: "Staff & Leadership", amount: "£82,000", percentage: 41 },
  { category: "Building & Facilities", amount: "£54,000", percentage: 27 },
  { category: "Ministries & Outreach", amount: "£38,000", percentage: 19 },
  { category: "Administration & Operations", amount: "£27,000", percentage: 13 },
];

export default function AnnualReportFinances() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Stewardship
            </p>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl lg:text-5xl">
              Financial Overview
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
              Your generosity enables us to serve, grow and impact our community. Here&apos;s how we stewarded the resources God entrusted to us.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-8 lg:grid-cols-2">
          <AnimateIn delay={100}>
            <div className="rounded-3xl bg-[#f5f7fa] p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="material-symbols-rounded text-2xl text-destiny-orange">trending_up</span>
                <h3 className="text-2xl font-black text-destiny-grey">Income</h3>
              </div>
              <div className="mb-6">
                <p className="text-4xl font-black text-destiny-grey">£201,000</p>
                <p className="text-sm text-destiny-grey/50">Total income for 2024</p>
              </div>
              <div className="space-y-4">
                {income.map((item) => (
                  <div key={item.category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-destiny-grey">{item.category}</span>
                      <span className="text-destiny-grey/60">{item.amount}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-destiny-orange"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>

          <AnimateIn delay={200}>
            <div className="rounded-3xl bg-[#f5f7fa] p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="material-symbols-rounded text-2xl text-destiny-orange">payments</span>
                <h3 className="text-2xl font-black text-destiny-grey">Expenses</h3>
              </div>
              <div className="mb-6">
                <p className="text-4xl font-black text-destiny-grey">£201,000</p>
                <p className="text-sm text-destiny-grey/50">Total expenses for 2024</p>
              </div>
              <div className="space-y-4">
                {expenses.map((item) => (
                  <div key={item.category}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-bold text-destiny-grey">{item.category}</span>
                      <span className="text-destiny-grey/60">{item.amount}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-destiny-grey"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimateIn>
        </div>

        <AnimateIn delay={300}>
          <div className="mt-8 rounded-3xl border-2 border-destiny-orange/20 bg-destiny-orange/5 p-6 text-center">
            <p className="text-sm font-bold text-destiny-grey">
              <span className="material-symbols-rounded mr-2 inline-block align-middle text-destiny-orange">info</span>
              Full audited accounts available on request. Contact the church office for more details.
            </p>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
