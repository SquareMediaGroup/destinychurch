import AnimateIn from "@/components/AnimateIn";

export default function CentennialIntro() {
  return (
    <section className="cent-grain bg-[#f7f1e8]">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28 lg:px-8">
        <AnimateIn>
          <p className="text-xs font-bold uppercase tracking-[0.4em] text-destiny-orange">
            A Century of Faith
          </p>
          <hr className="cent-rule mx-auto mt-6 w-16" />
        </AnimateIn>

        <AnimateIn delay={100}>
          <h2
            className="mt-8 text-3xl leading-snug text-[#2c1a0e] sm:text-4xl md:text-[2.75rem]"
            style={{ fontFamily: "var(--font-playfair)", fontWeight: 600 }}
          >
            It began with a handful of families, a borrowed hall, and a
            stubborn hope that God was not finished with this town.
          </h2>
        </AnimateIn>

        <AnimateIn delay={180}>
          <p className="mt-8 text-base leading-relaxed text-[#5a4a3a] sm:text-lg">
            In the autumn of 1926, the doors of a small mission on Norton Road
            opened for the very first time. Stockton-on-Tees was a town of
            shipyards and chimney smoke, and the little gathering that met there
            had no money and no building of its own &mdash; only conviction.
          </p>
        </AnimateIn>

        <AnimateIn delay={240}>
          <p className="mt-5 text-base leading-relaxed text-[#5a4a3a] sm:text-lg">
            One hundred years later we are still here, still on Norton Road,
            still believing the same simple thing: that everyone deserves a
            place to belong and a reason to hope. Three pastors, four
            generations, and countless lives have carried that flame between
            then and now. This is the road we have walked.
          </p>
        </AnimateIn>
      </div>
    </section>
  );
}
