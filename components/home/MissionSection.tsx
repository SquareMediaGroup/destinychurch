import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";

export default function MissionSection() {
  return (
    <section className="px-4 py-10 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">

        <AnimateIn className="max-w-3xl">
          <span className="mb-5 block text-sm font-bold uppercase tracking-widest text-destiny-orange">
            Our Mission
          </span>
          <h2 className="text-3xl font-black leading-tight text-gray-900 sm:text-4xl md:text-5xl">
            Transforming Lives through{" "}
            <span className="text-destiny-orange">Faith, Hope and Love</span>{" "}
            for Jesus.
          </h2>
          <p className="mt-5 text-base leading-relaxed text-gray-600 sm:mt-7 sm:text-xl">
            Destiny Church exists to bring people to Jesus and membership of his
            family, developing them to maturity in Christ, and equipping them for
            their ministry in the Church and mission in the world, in order to
            magnify God&apos;s name.
          </p>
        </AnimateIn>

        <AnimateIn delay={150} className="mt-8 flex flex-col items-start gap-5 sm:mt-10">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-destiny-orange/10">
              <Image
                src="/img/brand/Team/JonathanCath.png"
                alt="Jonathan & Cath Harris"
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900">Jonathan &amp; Cath Harris</p>
              <p className="text-sm text-gray-500">Lead Pastors</p>
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
