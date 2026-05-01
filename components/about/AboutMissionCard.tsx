import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

export default function AboutMissionCard() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl py-16">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
          style={{ backgroundImage: "url('/img/photos/WorshipMoment1.webp')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/50" />

        <div className="relative mx-auto max-w-3xl px-8 lg:px-12">
          <AnimateIn>
            <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" />
              </svg>
              Our Mission
            </p>

            <h2 className="mb-6 text-3xl font-black leading-tight text-white md:text-4xl lg:text-5xl">
              Transforming Lives through<br />
              <span className="text-destiny-orange">faith, hope and love</span> for Jesus.
            </h2>

            <p className="mb-10 text-base leading-relaxed text-white/70 md:text-lg">
              Destiny Church exists to bring people to Jesus and membership of his
              family, developing them to maturity in Christ, and equipping them for
              their ministry in the Church and mission in the world, in order to
              magnify God&apos;s name.
            </p>

            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-full bg-destiny-orange/20">
                <Image
                  src="/img/photos/Elders.webp"
                  alt="Jonathan & Cath Harris"
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Jonathan &amp; Cath Harris</p>
                <p className="text-xs text-white/40">Lead Pastors</p>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
