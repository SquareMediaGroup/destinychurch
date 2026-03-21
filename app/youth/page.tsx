import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

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
                <Image src="/img/Alpha/YouthAlpha/5.png" alt="Youth" width={300} height={220} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/Alpha/YouthAlpha/6.png" alt="Youth" width={300} height={220} className="w-full object-cover" />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* When & where */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <AnimateIn delay={0}>
              <div className="flex items-start gap-4 rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">calendar_month</span>
                </div>
                <div>
                  <p className="mb-1 font-black text-destiny-grey">Every Wednesday</p>
                  <p className="text-sm text-destiny-grey/60">7:00pm – 8:30pm</p>
                </div>
              </div>
            </AnimateIn>
            <AnimateIn delay={80}>
              <div className="flex items-start gap-4 rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">location_on</span>
                </div>
                <div>
                  <p className="mb-1 font-black text-destiny-grey">Destiny Centre</p>
                  <p className="text-sm text-destiny-grey/60">Norton Road, Stockton-on-Tees, TS20 2QQ</p>
                </div>
              </div>
            </AnimateIn>
            <AnimateIn delay={160}>
              <div className="flex items-start gap-4 rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">group</span>
                </div>
                <div>
                  <p className="mb-1 font-black text-destiny-grey">Ages 11–18</p>
                  <p className="text-sm text-destiny-grey/60">KS3, KS4 &amp; KS5 groups</p>
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Age groups */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">Our Groups</h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">Split by school year so every young person is with their peers</p>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-3">
            {groups.map((g, i) => (
              <AnimateIn key={g.name} delay={i * 80}>
                <div className="overflow-hidden rounded-3xl">
                  <div className="p-8" style={{ background: g.color }}>
                    <div className="mb-4 flex items-center gap-3">
                      <span className="material-symbols-rounded text-4xl text-white/80">{g.icon}</span>
                      <div>
                        <h3 className="text-2xl font-black text-white">{g.name}</h3>
                        <p className="text-sm font-bold text-white/60">{g.ages}</p>
                      </div>
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
      <section style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }} className="py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
            <AnimateIn className="w-full overflow-hidden rounded-3xl md:w-2/5">
              <Image src="/img/Alpha/Alpha/IG-MAIN-scaled.jpg" alt="Youth Alpha" width={600} height={400} className="w-full object-cover" />
            </AnimateIn>
            <AnimateIn delay={100} className="w-full md:w-3/5">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Explore Faith</p>
              <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">Youth Alpha</h2>
              <p className="mb-6 text-base leading-relaxed text-white/70">
                Got questions about life, faith and what it all means? Youth Alpha is a space for young people to explore the big questions honestly, without pressure or judgement.
              </p>
              <Link
                href="/alpha"
                className="inline-flex items-center rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
              >
                Find out about Alpha
              </Link>
            </AnimateIn>
          </div>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
