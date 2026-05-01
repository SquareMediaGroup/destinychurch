import type { Metadata } from "next";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";

export const metadata: Metadata = {
  title: "Baptism",
  description: "Take the next step of faith and get baptised at Destiny Church Tees Valley. Sign up below and we'll be in touch.",
  alternates: { canonical: "/baptism" },
  openGraph: {
    title: "Baptism | Destiny Church Tees Valley",
    description: "Take the next step of faith and get baptised at Destiny Church Tees Valley.",
    url: "https://destinytees.uk/baptism",
  },
};

const reasons = [
  { icon: "water_drop", title: "A Public Declaration", body: "Baptism is an outward expression of an inward decision — declaring that you belong to Jesus." },
  { icon: "auto_awesome", title: "A Fresh Start", body: "Symbolising the death of your old life and resurrection into a new one with Christ." },
  { icon: "favorite", title: "Following Jesus", body: "Jesus himself was baptised, and he calls every believer to take this step in obedience." },
  { icon: "diversity_3", title: "Celebrating Together", body: "We celebrate every baptism as a family — your moment becomes a milestone for the whole church." },
];

export default function BaptismPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/Yannick Baptism Photo.webp')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/75" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                Next Steps
              </p>
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">
                Baptism
              </h1>
              <p className="mt-4 text-base text-white/70 md:text-lg">
                Go public with your faith.
              </p>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* What is baptism */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-20">
            <AnimateIn className="w-full md:w-1/2">
              <div className="overflow-hidden rounded-3xl">
                <Image
                  src="/img/photos/Yannick Baptism Photo.webp"
                  alt="Baptism at Destiny Church"
                  width={640}
                  height={440}
                  className="w-full object-cover"
                />
              </div>
            </AnimateIn>
            <AnimateIn delay={100} className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                Why get baptised?
              </p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">
                A public step of faith
              </h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                Baptism is one of the most important steps you can take as a follower of Jesus.
                It&apos;s a public declaration that you have given your life to Christ, leaving
                behind your old life and stepping into the new one he has for you.
              </p>
              <p className="text-base leading-relaxed text-destiny-grey/70">
                If you&apos;ve made a decision to follow Jesus and you&apos;re ready to take this
                step, we&apos;d love to celebrate it with you. Fill in the form below and our
                team will be in touch.
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
              What Baptism Means
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
              Sign Up
            </p>
            <h2 className="mb-3 text-center text-3xl font-black text-white md:text-4xl">
              Get Baptised
            </h2>
            <p className="mb-10 text-center text-base text-white/60">
              Fill in the form below and we&apos;ll be in touch with the next steps.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <ChurchSuiteEmbed
              src="https://destinytees.churchsuite.com/forms/sdxbpkle"
              title="Baptism sign up"
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
