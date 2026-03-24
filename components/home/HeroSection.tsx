import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-destiny-grey">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/img/photos/Hero%20BKG.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div
        className="relative z-10 px-4 text-center"
        style={{ animation: "fadeInUp 0.9s ease forwards" }}
      >
        <h1 className="whitespace-nowrap uppercase leading-[0.9] tracking-tight text-white text-[clamp(2.5rem,10vw,9.8rem)]" style={{ fontFamily: "var(--font-anton)" }}>
          <span className="relative inline-block">
            Welcome
            <Image
              src="/img/brand/Scribble.png"
              alt=""
              width={700}
              height={100}
              className="absolute left-1/2 w-[105%] -translate-x-[49%]" style={{ bottom: "-0.2em" }}
              priority
              aria-hidden="true"
            />
          </span>
          {" "}Home
        </h1>

      </div>

      {/* CTAs pinned to bottom */}
      <div className="absolute bottom-6 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-3 px-4 sm:bottom-10 sm:gap-4">
        <a
          href="/visit"
          className="rounded-full bg-destiny-orange px-6 py-3 text-xs font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110 sm:px-8 sm:py-3.5 sm:text-sm"
        >
          Plan a Visit
        </a>
        <a
          href="/sermons"
          className="rounded-full border-2 border-white/30 px-6 py-3 text-xs font-bold text-white backdrop-blur-sm transition hover:border-white hover:bg-white/10 sm:px-8 sm:py-3.5 sm:text-sm"
        >
          Sermons
        </a>
      </div>
    </section>
  );
}
