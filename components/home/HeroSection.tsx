import Image from "next/image";

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-destiny-grey">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/img/photos/hero-bg.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div
        className="relative z-10 px-4 text-center"
        style={{ animation: "fadeInUp 0.9s ease forwards" }}
      >
        <p className="font-subheading mb-2 text-lg font-medium tracking-widest text-white/70 uppercase md:text-xl">
          Jesus
        </p>
        <h1 className="text-5xl font-black uppercase leading-[0.95] tracking-tight text-white md:text-7xl lg:text-8xl">
          Welcome
          <br />
          Home
        </h1>
        <div className="mt-2 flex justify-center">
          <Image
            src="/img/brand/scribble.png"
            alt=""
            width={320}
            height={48}
            className="w-56 md:w-80"
            priority
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
