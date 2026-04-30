import type { Metadata } from "next";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";

export const metadata: Metadata = {
  title: "Child Dedication",
  description: "Dedicate your child to the Lord at Destiny Church Tees Valley. Request a child dedication and we'll be in touch.",
  alternates: { canonical: "/child-dedication" },
  openGraph: {
    title: "Child Dedication | Destiny Church Tees Valley",
    description: "Dedicate your child to the Lord at Destiny Church Tees Valley.",
    url: "https://destinytees.uk/child-dedication",
  },
};

const reasons = [
  { icon: "favorite", title: "A Gift from God", body: "Children are a heritage from the Lord. Dedication is a chance to thank him and give your child back to him." },
  { icon: "volunteer_activism", title: "A Parent's Promise", body: "Commit before God and your church family to raise your child to know and love Jesus." },
  { icon: "diversity_3", title: "A Church Family", body: "Our whole church stands with you, praying for and supporting your family on the journey." },
  { icon: "auto_awesome", title: "A Special Moment", body: "A meaningful celebration with friends and family during one of our Sunday services." },
];

export default function ChildDedicationPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/Kids1.png')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/75" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                Family
              </p>
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">
                Child Dedication
              </h1>
              <p className="mt-4 text-base text-white/70 md:text-lg">
                Dedicate your child to the Lord.
              </p>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* What is child dedication */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-20">
            <AnimateIn className="w-full md:w-1/2">
              <div className="overflow-hidden rounded-3xl">
                <Image
                  src="/img/photos/Kids2.jpg"
                  alt="Children at Destiny Church"
                  width={640}
                  height={440}
                  className="w-full object-cover"
                />
              </div>
            </AnimateIn>
            <AnimateIn delay={100} className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                What is Child Dedication?
              </p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">
                A blessing for your family
              </h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                Child dedication is a special moment where parents commit to raising their child
                in the love and knowledge of Jesus. It&apos;s a chance to publicly thank God for
                the gift of your child and to ask for his blessing on their life.
              </p>
              <p className="text-base leading-relaxed text-destiny-grey/70">
                During a Sunday service, our pastors will pray over your child and family,
                surrounded by your church family who promise to love, support and pray for you
                along the way. Fill in the form below to request a dedication.
              </p>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-12 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              Why Dedicate Your Child?
            </h2>
          </AnimateIn>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((perk, i) => (
              <AnimateIn key={perk.title} delay={i * 80}>
                <div className="flex flex-col items-start rounded-3xl bg-white p-7 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-2xl text-destiny-orange">{perk.icon}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-black text-destiny-grey">{perk.title}</h3>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">{perk.body}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Sign up form */}
      <section style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }} className="py-20">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-destiny-orange">
              Request a Dedication
            </p>
            <h2 className="mb-3 text-center text-3xl font-black text-white md:text-4xl">
              Dedicate Your Child
            </h2>
            <p className="mb-10 text-center text-base text-white/60">
              Fill in the form below and we&apos;ll be in touch to arrange the details.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <ChurchSuiteEmbed
              src="https://destinytees.churchsuite.com/forms/tb7deesr"
              title="Child Dedication request"
              height={900}
              className="rounded-3xl shadow-2xl"
            />
          </AnimateIn>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
