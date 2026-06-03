import AnimateIn from "@/components/AnimateIn";

type Milestone = {
  year: string;
  title: string;
  body: string;
  era?: string;
};

const MILESTONES: Milestone[] = [
  {
    year: "1926",
    era: "The Hollingsworth Years",
    title: "A mission is born",
    body: "Reverend Albert Hollingsworth and seven families open the Norton Road Mission in a rented hall above a draper's shop. Sunday meetings begin by gaslight with a single harmonium for worship.",
  },
  {
    year: "1934",
    title: "Bread for the town",
    body: "Through the depths of the Depression the mission runs a soup kitchen six days a week, feeding shipyard families who had run out of everything but pride.",
  },
  {
    year: "1941",
    title: "A shelter in the storm",
    body: "During the war years the hall doubles as an air-raid refuge. The congregation meets faithfully through blackouts, rationing and loss, refusing to let the lamp go out.",
  },
  {
    year: "1958",
    era: "The Caldwell Years",
    title: "A new shepherd, a new name",
    body: "After thirty-two years, Reverend Hollingsworth retires. Pastor Raymond Caldwell takes the helm and the fellowship is reborn as Stockton Christian Fellowship, buying its first building of its own.",
  },
  {
    year: "1969",
    title: "Room to grow",
    body: "A wave of new families arrives and the building is extended. A youth club, a brass band and a thriving Sunday school turn the church into the beating heart of the neighbourhood.",
  },
  {
    year: "1983",
    title: "Beyond our walls",
    body: "The church plants its first outreach across the river and sends its first overseas mission team, discovering a calling that would only grow with the decades.",
  },
  {
    year: "1994",
    era: "The Okonkwo Years",
    title: "Destiny Church begins",
    body: "Pastor David Okonkwo becomes the third pastor in the church's history. Under his leadership the congregation is renamed Destiny Church and embraces a vision for a truly multi-cultural family of faith.",
  },
  {
    year: "2003",
    title: "Every nation, one family",
    body: "Alpha courses, community care and worship in a dozen accents transform the church. People from across the world make Stockton home and Destiny their family.",
  },
  {
    year: "2014",
    title: "The Destiny Centre",
    body: "The church moves into the refurbished Destiny Centre on Norton Road, with space for kids, youth, recovery and the whole community to gather seven days a week.",
  },
  {
    year: "2020",
    title: "Church without walls",
    body: "When the world shut its doors, the church opened new ones — moving online overnight, delivering food parcels and prayer to thousands, and proving again that the church is people, not a place.",
  },
  {
    year: "2026",
    title: "One hundred years",
    body: "A century after seven families first gathered by gaslight, Destiny Church celebrates one hundred years — and looks with the same stubborn hope toward the next.",
  },
];

export default function CentennialTimeline() {
  return (
    <section className="cent-grain bg-[#2c1a0e]">
      <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28 lg:px-8">
        <AnimateIn className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#e8c674]">
            The Road We Walked
          </p>
          <h2
            className="mt-5 text-4xl text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-playfair)", fontWeight: 600 }}
          >
            A Hundred-Year Timeline
          </h2>
        </AnimateIn>

        <div className="relative mt-16">
          {/* Centre spine */}
          <div
            className="absolute bottom-0 top-0 w-px md:left-1/2 left-[11px] -translate-x-1/2"
            style={{
              background:
                "linear-gradient(to bottom, transparent, rgba(184,132,47,0.7) 8%, rgba(184,132,47,0.7) 92%, transparent)",
            }}
          />

          <ol className="space-y-12 md:space-y-16">
            {MILESTONES.map((m, i) => {
              const leftSide = i % 2 === 0;
              return (
                <li key={m.year} className="relative">
                  <AnimateIn delay={60}>
                    <div
                      className={[
                        "relative pl-12 md:w-1/2 md:pl-0",
                        leftSide
                          ? "md:pr-12 md:text-right"
                          : "md:ml-auto md:pl-12",
                      ].join(" ")}
                    >
                      {/* Node */}
                      <span
                        className={[
                          "absolute top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-[#2c1a0e]",
                          "left-0 md:left-auto",
                          leftSide ? "md:-right-3" : "md:-left-3",
                        ].join(" ")}
                        style={{
                          background:
                            "linear-gradient(135deg, #e8c674, #b8842f)",
                        }}
                        aria-hidden="true"
                      >
                        <span className="h-2 w-2 rounded-full bg-[#2c1a0e]" />
                      </span>

                      {/* Era ribbon */}
                      {m.era && (
                        <span className="mb-3 inline-block rounded-full border border-destiny-orange/40 bg-destiny-orange/10 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.25em] text-destiny-orange">
                          {m.era}
                        </span>
                      )}

                      <div
                        className="cent-gold-text text-5xl leading-none sm:text-6xl"
                        style={{
                          fontFamily: "var(--font-playfair)",
                          fontWeight: 700,
                        }}
                      >
                        {m.year}
                      </div>
                      <h3
                        className="mt-3 text-xl font-bold text-white sm:text-2xl"
                        style={{ fontFamily: "var(--font-playfair)" }}
                      >
                        {m.title}
                      </h3>
                      <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">
                        {m.body}
                      </p>
                    </div>
                  </AnimateIn>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
