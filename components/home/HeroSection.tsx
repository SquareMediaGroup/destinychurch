import Image from "next/image";
import Button from "@/components/ui/Button";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-destiny-grey">
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
          className="uppercase leading-[0.85] tracking-tight text-white text-[clamp(2.25rem,22vw,9.8rem)] md:whitespace-nowrap md:text-[clamp(2.5rem,10vw,9.8rem)]"
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
        <Button
          href="/visit"
          size="md"
          className="text-xs shadow-lg shadow-destiny-orange/30 sm:px-8 sm:py-3.5 sm:text-sm"
        >
          Plan your visit
        </Button>
        <Button
          href="/new-here"
          variant="onDark"
          size="md"
          className="text-xs backdrop-blur-sm sm:px-8 sm:py-3.5 sm:text-sm"
        >
          New Here?
        </Button>
      </div>
    </section>
  );
}