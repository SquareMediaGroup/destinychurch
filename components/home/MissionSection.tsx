import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

export default function MissionSection() {
  return (
    <section className="bg-[#1a1108]">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <AnimateIn>
          <div className="mx-auto max-w-3xl rounded-3xl bg-[#2c1a0e] p-8 shadow-2xl md:p-12">
            {/* Icon */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destiny-orange/20">
                <svg className="h-5 w-5 text-destiny-orange" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-white/50">
                Our Mission
              </span>
            </div>

            <h2 className="mb-6 text-2xl font-black leading-tight text-white md:text-3xl">
              Transforming Lives through
              <br />
              faith, hope and love for Jesus.
            </h2>

            <p className="mb-8 text-base leading-relaxed text-white/70">
              Destiny Church exists to bring people to Jesus and membership of his
              family, developing them to maturity in Christ, and equipping them for
              their ministry in the Church and mission in the world, in order to
              magnify God&apos;s name.
            </p>

            {/* Pastor attribution */}
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-destiny-orange/30">
                <Image
                  src="/img/photos/pastors-thumb.jpg"
                  alt="Jonathan & Cath Harris"
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  Jonathan &amp; Cath Harris
                </p>
                <p className="text-xs text-white/50">Lead Pastors</p>
              </div>
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
