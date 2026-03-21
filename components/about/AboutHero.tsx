import AnimateIn from "@/components/AnimateIn";

export default function AboutHero() {
  return (
    <div className="px-4 pt-8 pb-0 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
          style={{ backgroundImage: "url('/img/photos/About Us BKG.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
          <AnimateIn>
            <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">
              About Us
            </h1>
            <p className="mt-4 text-base text-white/70 md:text-lg">
              Learn more about the Church &amp; What We Believe
            </p>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
