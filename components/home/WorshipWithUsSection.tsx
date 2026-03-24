import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

export default function WorshipWithUsSection() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl">
        {/* Background image */}
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
          style={{ backgroundImage: "url('/img/photos/WorshipWUs.jpg')" }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-10 sm:gap-8 sm:py-16 md:flex-row md:items-center lg:px-8">
          <AnimateIn className="max-w-xl">
            <h2 className="mb-3 text-2xl font-black text-white sm:mb-4 sm:text-3xl md:text-4xl">
              Worship With Us
            </h2>
            <p className="text-sm leading-relaxed text-white/70 sm:text-base">
              Church is a place to belong, not an event to attend. As a community,
              together, we can be more and do more as we press on to be all God
              wants us to be. Come and experience an awesome time of praise,
              worship, teaching and friendship.
            </p>
          </AnimateIn>

          <AnimateIn delay={150} className="flex flex-col gap-3">
            <Link
              href="/new-here"
              className="rounded-full bg-destiny-orange px-8 py-3 text-center text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
            >
              Plan Your Visit
            </Link>
            <Link
              href="/sermons"
              className="rounded-full border-2 border-white/30 px-8 py-3 text-center text-sm font-bold text-white backdrop-blur transition hover:border-white/60 hover:bg-white/10"
            >
              Watch Church Online
            </Link>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
