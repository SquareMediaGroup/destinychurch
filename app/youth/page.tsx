import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import YouthAlphaSection from "@/components/youth-alpha/YouthAlphaSection";

export const metadata: Metadata = {
  title: "Destiny Youth",
  description: "Destiny Youth meets every Wednesday 7–8:30pm for young people aged 11–18 in Stockton-on-Tees. An energetic, welcoming space to encounter God and build real friendships.",
  alternates: { canonical: "/youth" },
  openGraph: {
    title: "Destiny Youth | Destiny Church Tees Valley",
    description: "Every Wednesday 7pm–8:30pm. KS3, KS4 & KS5 groups for young people aged 11–18 in Stockton-on-Tees.",
    url: "https://destinytees.uk/youth",
  },
};

const groups = [
  {
    name: "KS3",
    ages: "11–14 years",
    color: "#F58021",
    icon: "bolt",
    description: "The transition into secondary school is a big deal. KS3 is a safe, energetic space where young people can ask big questions, make real friends and discover who they are in God.",
  },
  {
    name: "KS4",
    ages: "14–16 years",
    color: "#0857BA",
    icon: "explore",
    description: "Identity, purpose and faith — the conversations that matter most. KS4 digs deeper into what it means to follow Jesus in the real world, navigating life with authenticity and courage.",
  },
  {
    name: "KS5",
    ages: "16–18 years",
    color: "#8106B1",
    icon: "rocket_launch",
    description: "On the edge of adulthood, KS5 is a community that prepares young people for what's ahead — faith-building, life skills, mentorship, and a genuine sense of calling and purpose.",
  },
];

export default function YouthPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/Youth1.JPG')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/80" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Every Wednesday · 7pm–8:30pm</p>
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">Destiny Youth</h1>
              <p className="mt-4 text-base text-white/70 md:text-lg">A generation rising — passionate about God, life and each other.</p>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* Intro */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">About Destiny Youth</p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">More than a youth group</h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                Destiny Youth meets every Wednesday evening from 7pm to 8:30pm. It&apos;s an energetic, welcoming space for young people aged 11–18 to encounter God, build deep friendships and discover their purpose.
              </p>
              <p className="text-base leading-relaxed text-destiny-grey/70">
                We believe this generation has something incredible to offer the world. Our aim is to walk alongside them — through the highs and the hard times — and help them become everything God made them to be.
              </p>
            </AnimateIn>
            <AnimateIn delay={100} className="grid w-full grid-cols-2 gap-3 md:w-1/2">
              <div className="col-span-2 overflow-hidden rounded-3xl">
                <Image src="/img/photos/Youth1.JPG" alt="Destiny Youth" width={640} height={320} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/Alpha/YouthAlpha/5.png" alt="" width={300} height={220} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/Alpha/YouthAlpha/6.png" alt="" width={300} height={220} className="w-full object-cover" />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Groups */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-12 text-center text-3xl font-black text-destiny-grey md:text-4xl">For every age</h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-3">
            {groups.map((g, i) => (
              <AnimateIn key={g.name} delay={i * 80}>
                <div className="overflow-hidden rounded-3xl shadow-sm transition hover:shadow-md">
                  <div
                    className="flex h-32 items-end justify-start p-6"
                    style={{ background: g.color }}
                  >
                    <div>
                      <p className="text-xs font-bold text-white/80">{g.ages}</p>
                      <p className="text-2xl font-black text-white">{g.name}</p>
                    </div>
                    <div className="ml-auto">
                      <span className="material-symbols-rounded text-5xl text-white/20">{g.icon}</span>
                    </div>
                  </div>
                  <div className="bg-[#f5f7fa] p-6">
                    <p className="text-sm leading-relaxed text-destiny-grey/70">{g.description}</p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Photo grid */}
      <section className="bg-[#f5f7fa] py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { src: "/img/photos/Youth1.JPG", tall: false },
              { src: "/img/Alpha/YouthAlpha/5.png", tall: false },
              { src: "/img/Alpha/YouthAlpha/6.png", tall: false },
              { src: "/img/photos/WorshipMoment1.jpg", tall: false },
            ].map((img, i) => (
              <AnimateIn key={i} delay={i * 60}>
                <div className="aspect-square overflow-hidden rounded-2xl">
                  <Image src={img.src} alt="" width={300} height={300} className="h-full w-full object-cover" />
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Youth Alpha CTA */}
      <YouthAlphaSection />

      <WorshipWithUsSection />
    </>
  );
}
