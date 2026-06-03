import AnimateIn from "@/components/AnimateIn";

const STATS = [
  { value: "100", label: "Years on Norton Road" },
  { value: "3", label: "Pastors in a century" },
  { value: "4", label: "Generations gathered" },
  { value: "30+", label: "Nations in our family" },
];

export default function CentennialStats() {
  return (
    <section
      className="cent-grain"
      style={{
        background:
          "linear-gradient(135deg, #2c1a0e 0%, #3d2b1a 50%, #2c1a0e 100%)",
      }}
    >
      <div className="mx-auto max-w-5xl px-4 py-20 sm:py-24 lg:px-8">
        <AnimateIn className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#e8c674]">
            A Century in Numbers
          </p>
        </AnimateIn>

        <div className="mt-12 grid grid-cols-2 gap-y-12 gap-x-4 md:grid-cols-4">
          {STATS.map((s, i) => (
            <AnimateIn key={s.label} delay={i * 100} className="text-center">
              <div
                className="cent-gold-text text-6xl leading-none sm:text-7xl"
                style={{ fontFamily: "var(--font-playfair)", fontWeight: 700 }}
              >
                {s.value}
              </div>
              <p className="mx-auto mt-4 max-w-[10rem] text-xs font-bold uppercase tracking-[0.2em] text-white/60">
                {s.label}
              </p>
            </AnimateIn>
          ))}
        </div>
      </div>
    </section>
  );
}
