import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import MissionSlideshow from "@/components/home/MissionSlideshow";

export default function MissionSection() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <section className="relative overflow-hidden rounded-3xl">
        <MissionSlideshow />

        {/* Cinematic bottom-weighted overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(8,4,1,0.55) 45%, rgba(5,2,0,0.96) 100%)",
          }}
        />

        {/* Content pinned to bottom */}
        <div className="relative mx-auto flex max-w-7xl flex-col justify-end gap-8 px-6 pt-40 pb-10 sm:pt-56 sm:pb-14 lg:px-10 lg:pb-16">

          <AnimateIn>
            {/* Orange accent rule */}
            <div className="mb-6 h-0.5 w-14 bg-destiny-orange" />

            <h2
              className="max-w-3xl text-4xl leading-[0.95] text-white sm:text-5xl md:text-6xl lg:text-7xl"
              style={{ fontFamily: "var(--font-anton)" }}
            >
              Transforming Lives through{" "}
              <span className="text-destiny-orange">Faith, Hope &amp; Love</span>{" "}
              for Jesus.
            </h2>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base">
              Destiny Church exists to bring people to Jesus and membership of his
              family, developing them to Christlikeness, and equipping them for
              ministry in the Church and mission in the world.
            </p>
          </AnimateIn>

          <AnimateIn delay={120} className="flex flex-wrap items-center gap-5 sm:gap-8">
            {/* Pastor attribution */}
            <div className="flex items-center gap-3.5">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full ring-2 ring-destiny-orange/35 ring-offset-2 ring-offset-black/80">
                <Image
                  src="/img/brand/Team/JonathanCath.png"
                  alt="Jonathan &amp; Cath Harris"
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Jonathan &amp; Cath Harris</p>
                <p className="text-xs text-destiny-orange/70 font-medium tracking-wide">Lead Pastors</p>
              </div>
            </div>

            {/* Divider */}
            <div className="hidden h-8 w-px bg-white/15 sm:block" />

            <Link
              href="/about"
              className="rounded-full bg-destiny-orange px-7 py-2.5 text-sm font-bold text-white shadow-lg shadow-destiny-orange/30 transition hover:brightness-110"
            >
              About Destiny Church
            </Link>
          </AnimateIn>

        </div>
      </section>
    </div>
  );
}
