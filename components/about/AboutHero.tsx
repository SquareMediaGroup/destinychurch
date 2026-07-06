import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

export default function AboutHero() {
  return (
    <div className="px-4 pt-8 pb-0 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl">
        <Image
          src="/img/photos/audience.webp"
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
              About Us
            </h1>
            <p className="mt-4 text-base text-white/70 md:text-lg">
              Learn more about the Church &amp; What We Believe
            </p>
          </AnimateIn>
        </div>

        <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-3 px-4 sm:bottom-10 sm:gap-4">
          <a
            href="#mission"
            aria-label="Scroll down"
            className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white/30 text-white backdrop-blur-sm transition hover:border-white hover:bg-white/10 sm:h-12 sm:w-12"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </a>
          <Link
            href="/beliefs"
            className="rounded-full bg-destiny-orange px-6 py-3 text-xs font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110 sm:px-8 sm:py-3.5 sm:text-sm"
          >
            Our Beliefs
          </Link>
        </div>
      </section>
    </div>
  );
}
