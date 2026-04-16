import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

export default function WhatsOnHero() {
  return (
    <div className="px-4 pt-8 pb-0 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl">
        {/* Background image */}
        <div className="absolute inset-0 scale-105 overflow-hidden blur-sm">
          <Image
            src="/img/photos/WorshipMoment2.jpg"
            alt=""
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
            aria-hidden="true"
          />
        </div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70" />

        <div className="relative flex flex-col items-center justify-center py-24 px-4 text-center">
          <AnimateIn>
            <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">
              What&apos;s On
            </h1>
            <p className="mt-4 text-base text-white/70 md:text-lg">
              Learn more about the Events and Courses at DC
            </p>
          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
