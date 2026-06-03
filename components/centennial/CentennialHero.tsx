import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

export default function CentennialHero() {
  return (
    <div className="px-4 pt-8 pb-0 lg:px-8">
      <section
        className="cent-grain relative overflow-hidden rounded-3xl"
        style={{
          background:
            "radial-gradient(120% 120% at 50% 0%, #3d2b1a 0%, #2c1a0e 45%, #1c1008 100%)",
        }}
      >
        {/* Faint historic photo wash behind the mark */}
        <Image
          src="/img/photos/WorshipMoment2.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          quality={70}
          className="object-cover object-center opacity-[0.10] mix-blend-screen"
        />
        {/* Vignette to keep the centre legible */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(80% 70% at 50% 45%, transparent 30%, rgba(15,8,3,0.65) 100%)",
          }}
        />

        <div className="relative flex flex-col items-center px-4 py-20 text-center sm:py-28 lg:py-36">
          {/* Top eyebrow */}
          <AnimateIn>
            <p
              className="text-[0.7rem] font-bold uppercase tracking-[0.45em] text-[#e8c674] sm:text-xs"
              style={{ paddingLeft: "0.45em" }}
            >
              Destiny Church Tees Valley
            </p>
            <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-[#b8842f] to-transparent" />
          </AnimateIn>

          {/* The 100 mark */}
          <AnimateIn delay={120}>
            <h1
              className="cent-gold-text mt-6 leading-[0.82] tracking-tight"
              style={{
                fontFamily: "var(--font-playfair)",
                fontWeight: 700,
                fontSize: "clamp(6rem, 26vw, 17rem)",
              }}
            >
              100
            </h1>
          </AnimateIn>

          {/* YEARS bar */}
          <AnimateIn delay={220}>
            <div className="mt-2 flex items-center justify-center gap-4 sm:gap-6">
              <span className="h-px w-10 bg-[#b8842f]/70 sm:w-16" />
              <span
                className="text-xl font-bold uppercase tracking-[0.6em] text-white sm:text-3xl"
                style={{ paddingLeft: "0.6em" }}
              >
                Years
              </span>
              <span className="h-px w-10 bg-[#b8842f]/70 sm:w-16" />
            </div>
          </AnimateIn>

          {/* Dates + tagline */}
          <AnimateIn delay={320}>
            <p
              className="mt-8 text-2xl text-[#e8c674] sm:text-3xl"
              style={{ fontFamily: "var(--font-playfair)", fontStyle: "italic" }}
            >
              1926 &ndash; 2026
            </p>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
              One hundred years of faith, hope and love on the banks of the Tees.
              From a single mission hall to a multi-cultural family &mdash; this is our story.
            </p>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
