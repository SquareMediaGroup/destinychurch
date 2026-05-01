import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import ConnectCardCTAs from "@/components/connect-card/ConnectCardCTAs";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Connect Card",
  description: "Fill in a connect card or submit a prayer request to Destiny Church Tees Valley. Take your next step with us — we'd love to get to know you.",
  alternates: { canonical: "/connect-card" },
  openGraph: {
    title: "Connect Card | Destiny Church Tees Valley",
    description: "Take your next step. Fill in a connect card or share a prayer request — we're here for you.",
    url: "https://destinytees.uk/connect-card",
  },
};

const steps = [
  {
    icon: "edit_note",
    title: "Fill in your card",
    body: "Tell us a bit about yourself — your name, where you're at, and what you'd love to explore next.",
  },
  {
    icon: "waving_hand",
    title: "We'll be in touch",
    body: "One of our team will reach out personally to say hello and point you in the right direction.",
  },
  {
    icon: "diversity_3",
    title: "Find your place",
    body: "Whether it's a Connect Group, a team to serve on, or just a friendly face on Sunday — we'll help you settle in.",
  },
];

export default function ConnectCardPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/Community.webp')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/85" />
          <div className="relative flex flex-col items-center justify-center py-[10rem] px-4 text-center">
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Stay Connected</p>
              <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">Connect Card</h1>
              <p className="mb-10 text-base text-white/70 md:text-lg">
                Take the next step — we&apos;d love to get to know you.
              </p>
            </AnimateIn>
            <AnimateIn delay={120}>
              <ConnectCardCTAs />
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
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">We&apos;d love to know you</h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                Whether you visited for the first time last Sunday or you&apos;ve been coming for years — filling in a Connect Card is one of the simplest ways to take a next step with Destiny Church.
              </p>
              <p className="text-base leading-relaxed text-destiny-grey/70">
                It helps us get to know you better, point you towards the right community, and make sure you feel at home. There&apos;s no obligation — just an open door.
              </p>
            </AnimateIn>
            <AnimateIn delay={100} className="grid w-full grid-cols-2 gap-3 md:w-1/2">
              <div className="col-span-2 overflow-hidden rounded-3xl">
                <Image src="/img/photos/Community.webp" alt="Community" width={640} height={300} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/Gallery/SN1_8070.CR2.jpeg" alt="" width={300} height={220} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/ConnectGroups.jpg" alt="" width={300} height={220} className="w-full object-cover" />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-12 text-center text-3xl font-black text-destiny-grey md:text-4xl">What happens next</h2>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <AnimateIn key={step.title} delay={i * 80}>
                <div className="flex flex-col items-start rounded-3xl bg-white p-7 shadow-sm">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-2xl text-destiny-orange">{step.icon}</span>
                  </div>
                  <p className="mb-1 text-xs font-bold text-destiny-orange">Step {i + 1}</p>
                  <h3 className="mb-2 text-lg font-black text-destiny-grey">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-destiny-grey/60">{step.body}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTAs */}
      <section style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }} className="py-20">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <AnimateIn>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-destiny-orange">Take a Next Step</p>
            <h2 className="mb-3 text-center text-3xl font-black text-white md:text-4xl">We&apos;re here for you</h2>
            <p className="mb-10 text-center text-base text-white/60">
              Fill in a connect card, or share something you&apos;d like us to pray about. Either way, we&apos;re listening.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <ConnectCardCTAs />
          </AnimateIn>
        </div>
      </section>

      {/* Prayer */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 text-center lg:px-8">
          <AnimateIn>
            <blockquote className="text-xl font-medium italic leading-relaxed text-destiny-grey md:text-2xl">
              &ldquo;Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.&rdquo;
            </blockquote>
            <p className="mt-6 text-sm font-bold text-destiny-orange">Philippians 4:6</p>
          </AnimateIn>
        </div>
      </section>

      {/* Other links */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-10 text-center text-2xl font-black text-destiny-grey">Explore more</h2>
          </AnimateIn>
          <div className="grid gap-5 sm:grid-cols-3">
            {[
              { icon: "groups", label: "Connect Groups", sub: "Find community near you", href: "/connect" },
              { icon: "waving_hand", label: "New Here?", sub: "Everything you need to know", href: "/new-here" },
              { icon: "volunteer_activism", label: "Serve", sub: "Join one of our teams", href: "/serve" },
            ].map((item, i) => (
              <AnimateIn key={item.href} delay={i * 60}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/10">
                    <span className="material-symbols-rounded text-xl text-destiny-orange">{item.icon}</span>
                  </div>
                  <div>
                    <p className="font-black text-destiny-grey">{item.label}</p>
                    <p className="text-xs text-destiny-grey/50">{item.sub}</p>
                  </div>
                  <span className="material-symbols-rounded ml-auto text-destiny-grey/30 transition group-hover:translate-x-0.5 group-hover:text-destiny-orange">chevron_right</span>
                </Link>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
