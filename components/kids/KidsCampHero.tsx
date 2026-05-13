import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

export default function KidsCampHero() {
  return (
    <div className="px-4 pt-8 pb-0 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl">
        <Image
          src="/img/photos/Kids2.webp"
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
            <h1 className="text-3xl font-black text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Kids Camp 2026
            </h1>
            <p className="mt-4 text-base text-white/70 md:text-lg">
              3 days of discipleship, worship and adventure at Moor House Adventure Centre
            </p>
            <a
              href="https://destinytees.churchsuite.com/events/gtxi02n4"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-destiny-orange px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110"
            >
              Sign Up Now
            </a>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
