import AnimateIn from "@/components/AnimateIn";

const ministries = [
  {
    name: "Alpha Outreach",
    description: "Launched three Alpha courses reaching 65 guests exploring faith, with 18 making first-time commitments to Christ.",
    icon: "lightbulb",
  },
  {
    name: "Community Food Bank",
    description: "Partnered with local charities to distribute over 500 food parcels to families in need across Teesside.",
    icon: "volunteer_activism",
  },
  {
    name: "Youth Mentoring Programme",
    description: "Paired 20 young people with trained mentors, providing guidance, support and discipleship.",
    icon: "diversity_3",
  },
  {
    name: "Prayer Ministry Team",
    description: "Expanded our prayer team to 15 members, offering confidential prayer support after every service.",
    icon: "favorite",
  },
  {
    name: "Worship Collective",
    description: "Grew our worship team to 30 musicians and vocalists, leading vibrant Sunday gatherings and special events.",
    icon: "music_note",
  },
];

export default function AnnualReportMinistries() {
  return (
    <section className="bg-[#f5f7fa] py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              New Initiatives
            </p>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl lg:text-5xl">
              Ministries Launched
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
              This year we launched and expanded ministries to better serve our church and community.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {ministries.map((ministry, i) => (
            <AnimateIn key={ministry.name} delay={i * 60}>
              <div className="flex flex-col rounded-3xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-3xl text-destiny-orange">
                    {ministry.icon}
                  </span>
                </div>
                <h3 className="mb-2 text-lg font-black text-destiny-grey">{ministry.name}</h3>
                <p className="text-sm leading-relaxed text-destiny-grey/60">{ministry.description}</p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
