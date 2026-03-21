import AnimateIn from "@/components/AnimateIn";

export default function AboutMissionStatement() {
  return (
    <section className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-8 lg:px-12">
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
      </div>
    </section>
  );
}
