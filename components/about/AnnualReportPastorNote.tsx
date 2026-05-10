import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";

export default function AnnualReportPastorNote() {
  return (
    <section className="py-20" style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }}>
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
          <AnimateIn className="shrink-0">
            <Image
              src="/img/brand/Team/JonathanCath.webp"
              alt="Jonathan & Cath Harris"
              width={380}
              height={480}
              className="w-72 object-contain md:w-80"
            />
          </AnimateIn>

          <AnimateIn delay={100} className="pt-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
              From Our Lead Pastors
            </p>
            <h2 className="mb-5 text-4xl font-black text-white md:text-5xl">
              Thank You
            </h2>
            <p className="mb-4 text-base leading-relaxed text-white/70">
              As we look back on this year, we are overwhelmed with gratitude. God has been faithful beyond measure, and you — the Destiny Church family — have been the hands and feet of Jesus in our community.
            </p>
            <p className="mb-4 text-base leading-relaxed text-white/70">
              Every baptism, every new member, every volunteer hour, and every generous gift has been a testament to what God can do when His people say yes. We've seen lives transformed, families restored, and hope brought to places that desperately needed it.
            </p>
            <p className="mb-4 text-base leading-relaxed text-white/70">
              Thank you for your faithfulness, your generosity, and your unwavering commitment to the mission God has called us to. We are excited for what lies ahead as we continue to transform lives through faith, hope and love for Jesus.
            </p>
            <p className="text-sm font-bold text-white/40">
              With love and gratitude,<br />
              Jonathan &amp; Cath Harris
            </p>
          </AnimateIn>
        </div>
      </div>
    </section>
  );
}
