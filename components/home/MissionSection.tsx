import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

export default function MissionSection() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-8 text-center lg:px-12">
        <AnimateIn>
          <p className="mb-5 text-xs font-bold uppercase tracking-widest text-destiny-grey/40">
            Our Mission
          </p>
          <h2 className="mb-8 text-3xl font-black leading-tight text-destiny-grey md:text-4xl lg:text-5xl">
            Transforming Lives through
            <br />
            <span className="text-destiny-orange">Faith, Hope and Love</span> for Jesus.
          </h2>
          <p className="text-lg leading-relaxed text-destiny-grey/60 md:text-xl">
            Destiny Church exists to bring people to Jesus and membership of his
            family, developing them to maturity in Christ, and equipping them for
            their ministry in the Church and mission in the world, in order to
            magnify God&apos;s name.
          </p>
        </AnimateIn>

        <AnimateIn delay={150} className="mt-10 flex flex-col items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-destiny-orange/10">
              <Image
                src="/img/brand/Team/JonathanCath.webp"
                alt="Jonathan & Cath Harris"
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <div className="text-left">
              <p className="text-base font-bold text-destiny-grey">Jonathan &amp; Cath Harris</p>
              <p className="text-sm text-destiny-grey/50">Lead Pastors</p>
            </div>
          </div>
          <Link
            href="/about"
            className="rounded-full bg-destiny-orange px-10 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
          >
            About Destiny Church
          </Link>
        </AnimateIn>
      </div>
    </section>
  );
}
