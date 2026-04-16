import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import MissionSlideshow from "@/components/home/MissionSlideshow";

export default function MissionSection() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl">
        {/* Slideshow background */}
        <MissionSlideshow />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1c0f06cc 0%, #0d0d0dee 100%)" }} />

        {/* Content */}
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-4 py-10 sm:gap-10 sm:py-16 md:flex-row md:items-end lg:px-8">

          <AnimateIn className="max-w-2xl">
            <span className="mb-4 block text-xs font-bold uppercase tracking-widest text-white/40">
              Our Mission
            </span>
            <h2 className="text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl">
              Transforming Lives through{" "}
              <span className="text-destiny-orange">Faith, Hope and Love</span>{" "}
              for Jesus.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/60 sm:mt-6 sm:text-base">
              Destiny Church exists to bring people to Jesus and membership of his
              family, developing them to maturity in Christ, and equipping them for
              their ministry in the Church and mission in the world, in order to
              magnify God&apos;s name.
            </p>
          </AnimateIn>

          <AnimateIn delay={150} className="flex shrink-0 flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 overflow-hidden rounded-full bg-destiny-orange/20">
                <Image
                  src="/img/brand/Team/JonathanCath.png"
                  alt="Jonathan & Cath Harris"
                  fill
                  className="object-cover"
                  sizes="44px"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Jonathan &amp; Cath Harris</p>
                <p className="text-xs text-white/40">Lead Pastors</p>
              </div>
            </div>
            <Link
              href="/about"
              className="rounded-full bg-destiny-orange px-8 py-3 text-center text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
            >
              About Destiny Church
            </Link>
          </AnimateIn>

        </div>
      </section>
    </div>
  );
}
