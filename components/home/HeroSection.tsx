export default function HeroSection() {
  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-destiny-grey">
      {/* Background image placeholder - replace src with actual hero image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url(/img/photos/hero-bg.jpg)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />

      <div className="relative z-10 px-4 text-center">
        <p className="font-subheading mb-2 text-lg font-medium tracking-widest text-white/70 uppercase md:text-xl">
          Jesus
        </p>
        <h1 className="text-5xl font-black uppercase leading-[0.95] tracking-tight text-white md:text-7xl lg:text-8xl">
          Welcome
          <br />
          Home
        </h1>
        {/* Handwritten-style SVG underline */}
        <svg
          className="mx-auto mt-2 h-6 w-48 md:h-8 md:w-64"
          viewBox="0 0 260 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 20C30 8 60 6 90 12C120 18 140 24 170 18C195 13 220 8 256 16"
            stroke="#f58021"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            style={{ filter: "url(#rough)" }}
          />
          <path
            d="M8 24C40 14 75 12 105 16C135 20 155 22 185 16C210 11 235 10 252 18"
            stroke="#f58021"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
          <defs>
            <filter id="rough">
              <feTurbulence
                type="turbulence"
                baseFrequency="0.05"
                numOctaves="2"
                result="noise"
              />
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale="2"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>
      </div>
    </section>
  );
}
