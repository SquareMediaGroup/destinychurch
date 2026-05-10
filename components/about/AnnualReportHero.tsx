import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

export default function AnnualReportHero() {
  return (
    <div className="px-4 pt-8 pb-0 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl">
        <Image
          src="/img/photos/WorshipMoment1.webp"
          alt=""
          aria-hidden="true"
          fill
          priority
          sizes="100vw"
          quality={82}
          className="scale-105 object-cover object-center blur-sm"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="relative flex flex-col items-center justify-center py-24 px-4 text-center sm:py-36 lg:py-[12rem]">
          <AnimateIn>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Looking Back, Moving Forward
            </p>
            <h1 className="text-3xl font-black text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Annual Report 2025
            </h1>
            <p className="mt-4 text-base text-white/70 md:text-lg">
              Celebrating a year of faith, growth and community
            </p>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
