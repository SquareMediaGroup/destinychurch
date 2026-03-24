import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import MissionSlideshow from "@/components/home/MissionSlideshow";

export default function MissionSection() {
  return (
    <div className="px-4 py-8 lg:px-8">
      <section className="group relative overflow-hidden rounded-3xl py-8 sm:py-14">
        {/* Slideshow background */}
        <MissionSlideshow />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1c0f06cc 0%, #0d0d0dee 100%)" }} />

        {/* Content */}
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
          <AnimateIn>

            {/* "Our Mission" label — collapses via grid */}
            <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-in-out group-hover:grid-rows-[1fr]">
              <div className="overflow-hidden min-h-0">
                <div className="pb-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                  <span className="text-xs font-bold uppercase tracking-widest text-white/40">
                    Our Mission
                  </span>
                </div>
              </div>
            </div>

            {/* Heading — always visible */}
            <h2 className="text-xl font-black leading-tight text-white sm:text-2xl md:text-3xl lg:text-4xl">
              Transforming Lives through
              <br />
              <span className="text-destiny-orange">Faith, Hope and Love</span> for Jesus.
            </h2>

            {/* Description + pastor row — collapses via grid */}
            <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 ease-in-out group-hover:grid-rows-[1fr]">
              <div className="overflow-hidden min-h-0">
                <div className="opacity-0 transition-opacity duration-500 delay-100 group-hover:opacity-100">
                  <p className="mt-4 mb-6 text-sm leading-relaxed text-white/60 sm:mt-6 sm:mb-8 sm:text-base md:text-lg">
                    Destiny Church exists to bring people to Jesus and membership of his
                    family, developing them to maturity in Christ, and equipping them for
                    their ministry in the Church and mission in the world, in order to
                    magnify God&apos;s name.
                  </p>

                  <div className="flex flex-col gap-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
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
                      className="rounded-full bg-destiny-orange px-6 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
                    >
                      About Destiny Church
                    </Link>
                  </div>
                </div>
              </div>
            </div>

          </AnimateIn>
        </div>
      </section>
    </div>
  );
}
