import AnimateIn from "@/components/AnimateIn";

type Pastor = {
  initials: string;
  name: string;
  title: string;
  years: string;
  tenure: string;
  quote: string;
};

const PASTORS: Pastor[] = [
  {
    initials: "AH",
    name: "Rev. Albert Hollingsworth",
    title: "Founding Pastor",
    years: "1926 – 1958",
    tenure: "32 years",
    quote:
      "A pioneer with a coalfield faith. He started the mission with nothing but conviction and carried the church through the Depression and the war on little more than prayer and porridge.",
  },
  {
    initials: "RC",
    name: "Pastor Raymond Caldwell",
    title: "Second Pastor",
    years: "1958 – 1994",
    tenure: "36 years",
    quote:
      "The builder. He gave the church its first home of its own, raised a generation of young families, and first sent us out beyond our own walls to the wider world.",
  },
  {
    initials: "DO",
    name: "Pastor David Okonkwo",
    title: "Third & Current Pastor",
    years: "1994 – present",
    tenure: "30+ years",
    quote:
      "The gatherer. Under his leadership the church became Destiny — a true family of every nation, language and story, where all can find a place to belong and thrive.",
  },
];

export default function CentennialPastors() {
  return (
    <section className="cent-grain bg-[#f7f1e8]">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28 lg:px-8">
        <AnimateIn className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-destiny-orange">
            Those Who Carried the Flame
          </p>
          <h2
            className="mt-5 text-4xl text-[#2c1a0e] sm:text-5xl"
            style={{ fontFamily: "var(--font-playfair)", fontWeight: 600 }}
          >
            Three Pastors, One Hundred Years
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-[#5a4a3a]">
            In a century of change, only three men have held the pastorate of
            this church &mdash; each handing the next a stronger flame than the
            one he received.
          </p>
        </AnimateIn>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {PASTORS.map((p, i) => (
            <AnimateIn key={p.name} delay={i * 120}>
              <article className="flex h-full flex-col items-center rounded-2xl border border-[#b8842f]/25 bg-white/70 p-8 text-center shadow-sm">
                {/* Monogram medallion */}
                <div
                  className="flex h-24 w-24 items-center justify-center rounded-full ring-1 ring-[#b8842f]/40"
                  style={{
                    background:
                      "radial-gradient(120% 120% at 30% 25%, #3d2b1a, #2c1a0e)",
                  }}
                >
                  <span
                    className="cent-gold-text text-3xl"
                    style={{
                      fontFamily: "var(--font-playfair)",
                      fontWeight: 700,
                    }}
                  >
                    {p.initials}
                  </span>
                </div>

                <p className="mt-6 text-[0.65rem] font-bold uppercase tracking-[0.3em] text-destiny-orange">
                  {p.title}
                </p>
                <h3
                  className="mt-2 text-2xl text-[#2c1a0e]"
                  style={{ fontFamily: "var(--font-playfair)", fontWeight: 600 }}
                >
                  {p.name}
                </h3>

                <div className="mt-3 flex items-center gap-3 text-sm font-semibold text-[#8a7355]">
                  <span>{p.years}</span>
                  <span className="h-1 w-1 rounded-full bg-[#b8842f]" />
                  <span>{p.tenure}</span>
                </div>

                <hr className="cent-rule my-5 w-12" />

                <p className="text-sm leading-relaxed text-[#5a4a3a]">
                  {p.quote}
                </p>
              </article>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
