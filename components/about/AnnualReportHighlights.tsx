import AnimateIn from "@/components/AnimateIn";

const highlights = [
  {
    icon: "celebration",
    number: "42",
    label: "Baptisms",
    description: "People publicly declaring their faith in Jesus",
  },
  {
    icon: "group_add",
    number: "87",
    label: "New Members",
    description: "Individuals joining the Destiny Church family",
  },
  {
    icon: "favorite",
    number: "5",
    label: "New Ministries",
    description: "Fresh initiatives launched to serve our community",
  },
  {
    icon: "volunteer_activism",
    number: "1,240",
    label: "Volunteer Hours",
    description: "Time given by our incredible serve teams",
  },
];

export default function AnnualReportHighlights() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Year in Review
            </p>
            <h2 className="mb-4 text-3xl font-black text-destiny-grey md:text-4xl lg:text-5xl">
              Key Milestones
            </h2>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-destiny-grey/60">
              God has been faithful. Here are some of the highlights from the past year.
            </p>
          </div>
        </AnimateIn>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item, i) => (
            <AnimateIn key={item.label} delay={i * 80}>
              <div className="flex flex-col items-center rounded-3xl bg-[#f5f7fa] p-8 text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-4xl text-destiny-orange">
                    {item.icon}
                  </span>
                </div>
                <p className="mb-2 text-5xl font-black text-destiny-grey">{item.number}</p>
                <h3 className="mb-2 text-lg font-black text-destiny-grey">{item.label}</h3>
                <p className="text-sm leading-relaxed text-destiny-grey/60">{item.description}</p>
              </div>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
