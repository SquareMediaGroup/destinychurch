import type { Metadata } from "next";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import ChurchSuiteEmbed from "@/components/ChurchSuiteEmbed";

export const metadata: Metadata = {
  title: "Connect Groups",
  description: "Join a Connect Group at Destiny Church Tees Valley. Small groups meeting throughout the week — a place to build real friendships, grow in faith and do life together.",
  alternates: { canonical: "/connect" },
  openGraph: {
    title: "Connect Groups | Destiny Church Tees Valley",
    description: "Find your people. Join a Connect Group and do life together with others in Stockton-on-Tees and beyond.",
    url: "https://destinytees.uk/connect",
  },
};

const perks = [
  { icon: "favorite", title: "Real Relationships", body: "Life is better together. Connect Groups are where friendships are formed and community is built." },
  { icon: "menu_book", title: "Grow in Faith", body: "Dig deeper into God's word in a relaxed, welcoming environment with people on the same journey." },
  { icon: "support", title: "Support & Care", body: "Whether you're going through something tough or just need people in your corner — we've got you." },
  { icon: "diversity_3", title: "Everyone Welcome", body: "Groups for all ages, stages and backgrounds. Wherever you are in life, there's a place for you." },
];

export default function ConnectGroupsPage() {
  return (
    <>
      {/* Hero */}
      <div className="px-4 pt-8 pb-8 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl">
          <div
            className="absolute inset-0 scale-105 bg-cover bg-center blur-sm"
            style={{ backgroundImage: "url('/img/photos/ConnectGroups.webp')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/75" />
          <div className="relative flex flex-col items-center justify-center py-[12rem] px-4 text-center">
            <AnimateIn>
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                Community
              </p>
              <h1 className="text-5xl font-black text-white md:text-6xl lg:text-7xl">
                Connect Groups
              </h1>
              <p className="mt-4 text-base text-white/70 md:text-lg">
                Find your people. Do life together.
              </p>
            </AnimateIn>
          </div>
        </section>
      </div>

      {/* What are connect groups */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-12 md:flex-row md:gap-20">
            <AnimateIn className="w-full md:w-1/2">
              <div className="overflow-hidden rounded-3xl">
                <Image
                  src="/img/photos/Community.webp"
                  alt="Connect Groups community"
                  width={640}
                  height={440}
                  className="w-full object-cover"
                />
              </div>
            </AnimateIn>
            <AnimateIn delay={100} className="w-full md:w-1/2">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
                What are Connect Groups?
              </p>
              <h2 className="mb-5 text-3xl font-black text-destiny-grey md:text-4xl">
                Church is more than Sunday
              </h2>
              <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                Connect Groups are small groups of people who meet regularly throughout the week
                to pray, study the Bible, support one another and do life together. They are the
                heartbeat of Destiny Church.
              </p>
              <p className="text-base leading-relaxed text-destiny-grey/70">
                We believe that real growth happens in community — not just in a Sunday service.
                Connect Groups are where you can be known, find accountability, and experience
                the fullness of what it means to be part of the Destiny family.
              </p>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* Why join */}
      <section className="bg-[#f5f7fa] py-16">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <h2 className="mb-12 text-center text-3xl font-black text-destiny-grey md:text-4xl">
              Why Join a Connect Group?
            </h2>
          </AnimateIn>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map((perk, i) => (
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
              Get Connected
            </p>
            <h2 className="mb-3 text-center text-3xl font-black text-white md:text-4xl">
              Join a Connect Group
            </h2>
            <p className="mb-10 text-center text-base text-white/60">
              Fill in the form below and we&apos;ll match you with the right group for you.
            </p>
          </AnimateIn>
          <AnimateIn delay={100}>
            <ChurchSuiteEmbed
              src="https://destinytees.churchsuite.com/forms/twuneiil"
              title="Connect Group sign up"
              height={750}
              className="rounded-3xl shadow-2xl"
            />
          </AnimateIn>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
