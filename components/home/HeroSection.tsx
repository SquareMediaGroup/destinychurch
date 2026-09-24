import Image from "next/image";
import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-destiny-grey">
      {/* Background image — the LCP element. `preload` puts it in the <head>;
          fetchPriority="high" is needed on top because Next 16 no longer adds it,
          and without it the browser queues this behind fonts and scripts.
          (No `quality` prop: only 75 is allowed by the images config, so
          anything else was being silently served at 75 anyway.) */}
      <Image
        src="/img/photos/Hero BKG.webp"
        alt=""
        aria-hidden="true"
        fill
        preload
        fetchPriority="high"
        sizes="100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div className="hero-text-animate relative z-10 px-4 text-center">
        <h1
          className="uppercase leading-[0.85] tracking-tight text-white text-[22vw] md:whitespace-nowrap md:text-[clamp(2.5rem,10vw,9.8rem)]"
          style={{ fontFamily: "var(--font-anton)" }}
        >
          <span className="relative inline-block">
            Welcome
            <Image
              src="/img/brand/Scribble.webp"
              alt=""
              width={700}
              height={100}
              className="absolute left-1/2 w-[105%] -translate-x-[49%]"
              style={{ bottom: "-0.3em" }}
              // Eager so it doesn't pop in, but not preloaded: a second
              // preload would compete with the hero image for bandwidth.
              loading="eager"
              aria-hidden="true"
            />
          </span>
          <span className="mt-4 block md:hidden">Home</span>
          <span className="hidden md:inline"> Home</span>
        </h1>

      </div>

      {/* CTAs pinned to bottom */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-3 px-4 sm:bottom-10 sm:gap-4">
        <Link
          href="/visit"
          className="rounded-full bg-destiny-orange px-6 py-3 text-xs font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110 sm:px-8 sm:py-3.5 sm:text-sm"
        >
          Plan your visit
        </Link>
        <Link
          href="/new-here"
          className="rounded-full border-2 border-white/30 px-6 py-3 text-xs font-bold text-white backdrop-blur-sm transition hover:border-white hover:bg-white/10 sm:px-8 sm:py-3.5 sm:text-sm"
        >
          New Here?
        </Link>
      </div>
    </section>
  );
}
