import AnimateIn from "@/components/AnimateIn";

export default function MagnifySection() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
          {/* Heart icon */}
          <AnimateIn className="shrink-0">
            <svg
              viewBox="0 0 120 110"
              className="h-40 w-40 md:h-52 md:w-52"
              fill="none"
              stroke="#ef4444"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M60 95 C60 95 10 60 10 30 C10 15 22 5 35 5 C45 5 54 11 60 20 C66 11 75 5 85 5 C98 5 110 15 110 30 C110 60 60 95 60 95Z" />
            </svg>
          </AnimateIn>

          {/* Text */}
          <AnimateIn delay={100}>
            <h2 className="mb-4 text-5xl font-black text-destiny-orange md:text-6xl">
              Magnify
            </h2>
            <p className="max-w-lg text-base leading-relaxed text-destiny-grey/70">
              At Destiny Church we love God passionately and enjoy
              worshipping God enthusiastically. God wants to be at the very
              centre of our lives and we believe that living fully surrendered to
              Jesus is the only way to find life that satisfies and has meaning.
            </p>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
