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
        <h1 className="whitespace-nowrap uppercase leading-[0.9] tracking-tight text-white text-[clamp(2rem,7.5vw,9.8rem)]" style={{ fontFamily: "var(--font-anton)" }}>
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
    </section>
  );
}
