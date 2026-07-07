import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Young Adults",
  description: "A community for 18–30s at Destiny Church Tees Valley. Events, meals, Connect Groups and doing life together — real friendships built outside of Sunday.",
  alternates: { canonical: "/young-adults" },
  openGraph: {
    title: "Young Adults | Destiny Church Tees Valley",
    description: "A community of 18–30s figuring out life, faith and everything in between. Based in Stockton-on-Tees.",
    url: "https://destinytees.uk/young-adults",
  },
};

const values = [
  { icon: "diversity_3", title: "Community", body: "Real friendships built outside of Sunday. We do life together — not just church." },
  { icon: "explore", title: "Purpose", body: "Helping you discover who you are, what you're called to, and how to live it out." },
  { icon: "favorite", title: "Faith", body: "Honest conversations about faith, doubt, God, and navigating the real world." },
  { icon: "celebration", title: "Fun", body: "We take God seriously. We don't take ourselves too seriously. Life's better that way." },
];

export default function YoungAdultsPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/YA1.webp')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/80" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
            <AnimateIn>
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">Young Adults</h1>
              <p className="mt-4 text-base text-white/70 md:text-lg">
                A community of 18–30s figuring out life, faith and everything in between.
              </p>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* Intro */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Who We Are</p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">Life is better together</h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                Young Adults is a community for those aged 18 and over. We&apos;re not a programme — we&apos;re a group of people who genuinely want to know God and each other better.
              </p>
              <p className="text-base leading-relaxed text-destiny-grey/70">
                We don&apos;t have a fixed weekly schedule — instead we come together for events, meals, trips and gatherings throughout the year. If you want to be kept in the loop, join our Connect Group or get in touch and we&apos;ll add you to the group.
              </p>
            </AnimateIn>
            <AnimateIn delay={100} className="grid w-full grid-cols-2 gap-3 md:w-1/2">
              <div className="col-span-2 overflow-hidden rounded-3xl">
                <Image src="/img/photos/YA1.webp" alt="Young Adults" width={640} height={300} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/Community.webp" alt="Community" width={300} height={220} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/WorshipMoment1.webp" alt="Worship" width={300} height={220} className="w-full object-cover" />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-12 text-center text-3xl font-black text-destiny-grey md:text-4xl">What We&apos;re About</h2>
          </AnimateIn>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((v, i) => (
              <AnimateIn key={v.title} delay={i * 80}>
                <div className="flex flex-col items-start rounded-3xl bg-white p-7 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-2xl text-destiny-orange">{v.icon}</span>
                  </div>
                  <h3 className="mb-2 text-lg font-black text-destiny-grey">{v.title}</h3>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">{v.body}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Events note */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn delay={0} className="grid w-full grid-cols-2 gap-3 md:w-1/2">
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/WorshipMoment2.webp" alt="" width={300} height={280} className="h-full w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/ConnectGroups.webp" alt="" width={300} height={280} className="h-full w-full object-cover" />
              </div>
              <div className="col-span-2 overflow-hidden rounded-2xl">
                <Image src="/img/photos/Gallery/YouthCommunity.webp" alt="" width={620} height={220} className="w-full object-cover" />
              </div>
            </AnimateIn>
            <AnimateIn delay={100} className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Events &amp; Gatherings</p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">We come together often</h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                From spontaneous get-togethers to planned events throughout the year — there&apos;s always something happening. Meals, social nights, worship evenings, day trips and more.
              </p>
              <p className="mb-6 text-base leading-relaxed text-destiny-grey/70">
                Keep an eye on our What&apos;s On page for upcoming events, or follow us on social media so you never miss what&apos;s next.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/whats-on"
                  className="rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
                >
                  See What&apos;s On
                </Link>
                <Link
                  href="/connect"
                  className="rounded-full border-2 border-destiny-grey/20 px-7 py-3 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
                >
                  Join a Connect Group
                </Link>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Connect Groups CTA */}
      <section style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }} className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <AnimateIn>
            <span className="material-symbols-rounded mb-4 block text-5xl text-destiny-orange">group</span>
            <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">Stay Connected</h2>
            <p className="mb-8 text-base leading-relaxed text-white/60">
              The best way to be part of Young Adults is to join one of our Connect Groups. It&apos;s where the real community happens — weekly catch-ups, prayer, and doing life together.
            </p>
            <Link
              href="/connect"
              className="inline-flex items-center rounded-full bg-destiny-orange px-8 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
            >
              Find a Connect Group
            </Link>
          </AnimateIn>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
