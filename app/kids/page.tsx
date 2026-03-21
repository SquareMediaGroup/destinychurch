import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Destiny Kids",
  description: "Destiny Kids runs every Sunday from 10:45am for children aged 0–11 at Destiny Church Stockton-on-Tees. Safe, fun and faith-filled classes for every age group.",
  alternates: { canonical: "/kids" },
  openGraph: {
    title: "Destiny Kids | Destiny Church Tees Valley",
    description: "Fun, safe and faith-filled Sunday classes for children aged 0–11. Led by DBS-checked volunteers who love little ones.",
    url: "https://destinytees.uk/kids",
  },
};

const classes = [
  {
    name: "Babies & Toddlers",
    ages: "0–1 years",
    color: "#F58021",
    icon: "child_care",
    description: "Parents of our youngest ones are warmly invited to enjoy the service from our dedicated balcony area above the main auditorium — a comfortable space to watch and worship while keeping your baby close.",
    detail: "Balcony above the main auditorium",
  },
  {
    name: "Destiny Tots",
    ages: "2–4 years",
    color: "#0857BA",
    icon: "emoji_people",
    description: "A warm, nurturing environment where our youngest children explore Bible stories, crafts and play in age-appropriate ways. Staffed by trained, DBS-checked volunteers who love little ones.",
    detail: "Tots Room",
  },
  {
    name: "KS1 Class",
    ages: "5–7 years",
    color: "#028002",
    icon: "menu_book",
    description: "Fun, engaging sessions combining worship, Bible teaching, games and creative activities. Children learn about God's love in a way that sparks their imagination and builds their faith.",
    detail: "Kids Room",
  },
  {
    name: "KS2 Class",
    ages: "8–11 years",
    color: "#8106B1",
    icon: "star",
    description: "Deeper Bible exploration, discussion and activities for older children. This group is a safe, exciting space for kids to ask questions, grow in faith and build friendships that last.",
    detail: "Kids Room",
  },
];

export default function KidsPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-top blur-sm"
            style={{ backgroundImage: "url('/img/photos/Kids1.png')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/75" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Every Sunday · 10:45am–12:30pm</p>
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">Destiny Kids</h1>
              <p className="mt-4 text-base text-white/70 md:text-lg">A place where every child belongs, grows and encounters God.</p>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* Intro + images */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">About Destiny Kids</p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">Faith starts young</h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                Destiny Kids runs every Sunday from 10:45am to 12:30pm, giving children aged 0–11 their own exciting, age-appropriate experience of church. Our classes are designed to make faith real, relevant and fun for every child.
              </p>
              <p className="text-base leading-relaxed text-destiny-grey/70">
                All of our leaders are DBS-checked and trained, and we take the safety and wellbeing of every child seriously. Destiny Kids is a safe, nurturing space where children can encounter God for themselves.
              </p>
            </AnimateIn>
            <AnimateIn delay={100} className="grid w-full grid-cols-2 gap-3 md:w-1/2">
              <div className="col-span-2 overflow-hidden rounded-3xl">
                <Image src="/img/photos/Kids1.png" alt="Destiny Kids" width={640} height={300} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/Kids2.jpg" alt="Destiny Kids" width={300} height={220} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/Community.webp" alt="Community" width={300} height={220} className="w-full object-cover" />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* When & where */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-10 text-center text-3xl font-black text-destiny-grey md:text-4xl">When & Where</h2>
          </AnimateIn>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimateIn delay={0}>
              <div className="flex items-start gap-4 rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">calendar_month</span>
                </div>
                <div>
                  <p className="mb-1 font-black text-destiny-grey">Every Sunday</p>
                  <p className="text-sm text-destiny-grey/60">11:45am – 12:30pm</p>
                  <p className="mt-1 text-xs text-destiny-grey/40">Children are welcomed during the main service</p>
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
                  <p className="text-sm text-destiny-grey/60">Norton Road, Stockton-on-Tees</p>
                  <p className="mt-1 text-xs text-destiny-grey/40">TS20 2QQ</p>
                </div>
              </div>
            </AnimateIn>
            <AnimateIn delay={160}>
              <div className="flex items-start gap-4 rounded-3xl bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destiny-orange/10">
                  <span className="material-symbols-rounded text-2xl text-destiny-orange">free_cancellation</span>
                </div>
                <div>
                  <p className="mb-1 font-black text-destiny-grey">Completely Free</p>
                  <p className="text-sm text-destiny-grey/60">No registration required</p>
                  <p className="mt-1 text-xs text-destiny-grey/40">Just bring the kids and we'll take care of the rest</p>
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
            <h2 className="mb-3 text-center text-3xl font-black text-destiny-grey md:text-4xl">Our Classes</h2>
            <p className="mb-12 text-center text-sm text-destiny-grey/50">Something for every age — from babies to year 6</p>
          </AnimateIn>
          <div className="grid gap-6 md:grid-cols-2">
            {classes.map((cls, i) => (
              <AnimateIn key={cls.name} delay={i * 80}>
                <div className="flex gap-5 rounded-3xl bg-[#f5f7fa] p-7">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: cls.color + "1a" }}>
                    <span className="material-symbols-rounded text-3xl" style={{ color: cls.color }}>{cls.icon}</span>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-3">
                      <h3 className="text-lg font-black text-destiny-grey">{cls.name}</h3>
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: cls.color }}>{cls.ages}</span>
                    </div>
                    <p className="mb-2 text-sm leading-relaxed text-destiny-grey/60">{cls.description}</p>
                    <p className="flex items-center gap-1.5 text-xs font-bold text-destiny-grey/40">
                      <span className="material-symbols-rounded text-sm">meeting_room</span>
                      {cls.detail}
                    </p>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Tots Mornings */}
      <section style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }} className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-16">
            <AnimateIn className="grid w-full grid-cols-2 gap-3 md:w-2/5">
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/Kids2.jpg" alt="Tots Morning" width={300} height={280} className="w-full object-cover" />
              </div>
              <div className="overflow-hidden rounded-2xl">
                <Image src="/img/photos/Kids1.png" alt="Tots Morning" width={300} height={280} className="w-full object-cover" />
              </div>
              <div className="col-span-2 overflow-hidden rounded-2xl">
                <Image src="/img/photos/Community.webp" alt="Community" width={620} height={220} className="w-full object-cover" />
              </div>
            </AnimateIn>
            <AnimateIn delay={100} className="w-full md:w-3/5">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">Free Event</p>
              <h2 className="mb-5 text-3xl font-black text-white md:text-4xl">Tots Mornings</h2>
              <p className="mb-6 text-base leading-relaxed text-white/70">
                Our Tots Mornings are a free, welcoming gathering for parents and their little ones aged 0–4. It's a relaxed morning of play, songs and community — a great chance to meet other parents and connect with the Destiny family.
              </p>
              <div className="mb-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-orange">When</p>
                  <p className="font-bold text-white">1st &amp; 3rd Sunday morning</p>
                  <p className="text-sm text-white/60">of every month</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-orange">Where</p>
                  <p className="font-bold text-white">Tots Room</p>
                  <p className="text-sm text-white/60">Destiny Centre</p>
                </div>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
              >
                Find out more
              </Link>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Kids Pastor */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:gap-12">
            <AnimateIn className="shrink-0">
              <div className="h-44 w-44 overflow-hidden rounded-3xl bg-[#f5f7fa]">
                <Image src="/img/brand/Team/FA.png" alt="Funke Awojide" width={176} height={176} className="h-full w-full object-contain" />
              </div>
            </AnimateIn>
            <AnimateIn delay={80}>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-destiny-orange">Meet the Kids Pastor</p>
              <h2 className="mb-3 text-2xl font-black text-destiny-grey">Funke Awojide</h2>
              <p className="mb-2 text-base leading-relaxed text-destiny-grey/70">
                Funke leads our Destiny Kids ministry with passion and dedication. She and her team create a safe, fun and faith-filled environment where every child can experience God's love and grow in their faith.
              </p>
              <p className="text-sm text-destiny-grey/40">Kids Pastor · funke@destinytees.uk</p>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Photo strip */}
      <section className="bg-[#f5f7fa] py-12">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              "/img/photos/Kids1.png",
              "/img/photos/Kids2.jpg",
              "/img/photos/Community.webp",
              "/img/photos/Kids1.png",
            ].map((src, i) => (
              <AnimateIn key={i} delay={i * 60}>
                <div className="aspect-square overflow-hidden rounded-2xl">
                  <Image src={src} alt="" width={300} height={300} className="h-full w-full object-cover" />
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
