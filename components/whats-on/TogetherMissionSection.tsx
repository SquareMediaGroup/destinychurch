import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

export default function TogetherMissionSection() {
  return (
    <section className="py-8 px-4 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl">
        {/* Blurred background */}
        <Image
          src="/img/photos/mission/Mission-3.png"
          alt=""
          fill
          className="scale-105 object-cover object-center blur-sm"
          sizes="(max-width: 1280px) 100vw, 1280px"
          quality={60}
          aria-hidden="true"
        />
        {/* Black to transparent gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20" />

        <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-10 px-8 py-16 md:flex-row lg:px-12">
          <AnimateIn className="max-w-md">
            <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">
              Together on a Mission
            </h2>
            <p className="mb-8 text-base leading-relaxed text-white/80">
              The church exists to communicate God&apos;s love and likeness and extend
              the community of believers in our community, country and overseas.
            </p>
            <Link
              href="/missions"
              className="inline-flex items-center justify-center rounded-full border-2 border-white/50 px-8 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/10"
            >
              Find out More
            </Link>
          </AnimateIn>

          <AnimateIn delay={150} className="w-full max-w-sm">
            <Image
              src="/img/photos/mission/together-on-mission.png"
              alt="Together on a Mission"
              width={500}
              height={400}
              className="w-full object-contain"
            />
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
