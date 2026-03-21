import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import NewHereHero from "@/components/new-here/NewHereHero";

export const metadata: Metadata = {
  title: "New Here?",
  description: "New to Destiny Church Tees Valley? Find out what to expect, how to get connected, and what your next step looks like. You are welcome here.",
  alternates: { canonical: "/new-here" },
  openGraph: {
    title: "New Here? | Destiny Church Tees Valley",
    description: "Welcome! Find out what to expect and how to get connected at Destiny Church Stockton-on-Tees.",
    url: "https://destinytees.uk/new-here",
  },
};

const cards = [
  {
    title: "New to Destiny Church?",
    image: "/img/brand/NewHere/Here, You Belong.png",
    description:
      "Welcome Home! We have lots of opportunities for you to connect, grow, learn and contribute whatever your age, experience, abilities and personality.",
    cta: { label: "Fill in Connect Form", href: "/connect" },
  },
  {
    title: "New to Faith?",
    image: "/img/brand/NewHere/You Said Yes.png",
    description:
      "You Said Yes! That's the best decision you'll ever make EVER. But now what? We have a range of courses and gatherings we would love to invite you to. It's casual, it's welcoming, it's for you.",
    cta: { label: "Register your interest", href: "/connect" },
  },
  {
    title: "Join a Connect Group",
    image: "/img/brand/NewHere/Connct Groups.png",
    description:
      "Our Connect Groups are an integral part of the life and health of the church. They enable us to be effective, powerful and fruitful witnesses in the world. Find people you can pray, grow and do life with.",
    cta: { label: "Join a Connect Group", href: "/connect" },
  },
];

export default function NewHerePage() {
  return (
    <>
      <NewHereHero />

      {/* Three paths */}
      <section className="bg-[#f5f7fa] pb-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {cards.map((card, i) => (
              <AnimateIn key={card.title} delay={i * 100}>
                <div className="flex flex-col">
                  {/* Title above image */}
                  <p className="mb-3 text-base font-black text-destiny-grey">
                    <span className="border-b-2 border-destiny-orange pb-0.5">{card.title}</span>
                  </p>

                  {/* Image */}
                  <div className="mb-4 overflow-hidden rounded-2xl">
                    <Image
                      src={card.image}
                      alt={card.title}
                      width={420}
                      height={260}
                      className="w-full object-cover"
                    />
                  </div>

                  {/* Body */}
                  <p className="mb-5 flex-1 text-sm leading-relaxed text-destiny-grey/70">
                    {card.description}
                  </p>

                  {/* CTA */}
                  <Link
                    href={card.cta.href}
                    className="inline-flex w-fit items-center rounded-full border border-destiny-grey/30 px-5 py-2 text-sm font-bold text-destiny-grey transition hover:border-destiny-orange hover:text-destiny-orange"
                  >
                    {card.cta.label}
                  </Link>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* Meet the Pastors */}
      <section style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }} className="py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <div className="flex flex-col items-center gap-10 md:flex-row md:gap-16">
            <AnimateIn className="shrink-0">
              <div className="h-52 w-52 overflow-hidden rounded-full md:h-64 md:w-64">
                <Image
                  src="/img/brand/Team/JonathanCath.png"
                  alt="Jonathan & Cath Harris"
                  width={256}
                  height={256}
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </AnimateIn>

            <AnimateIn delay={100}>
              <h2 className="mb-5 text-4xl font-black text-white md:text-5xl">
                Meet Our{" "}
                <span className="relative inline-block">
                  Pastors
                  <Image
                    src="/img/brand/Scribble.png"
                    alt=""
                    width={400}
                    height={60}
                    className="absolute left-1/2 w-[110%] -translate-x-[49%]"
                    style={{ bottom: "-0.2em" }}
                    aria-hidden="true"
                  />
                </span>
              </h2>
              <p className="mb-6 max-w-xl text-base leading-relaxed text-white/70">
                Jonathan and Catherine are leaders with a passion for family, for the city and for
                seeing God&apos;s love and comfort outworked in people. They have both served as lead
                pastors at Destiny for over two decades. Jonathan is the church&apos;s Senior Pastor,
                passionate about building team and unleashing the potential in others. Catherine
                has a heart for teaching and training; she is an integral part of our Community and
                Care Team leading our town. They are proud parents to Faith &amp; Nadine Harris.
              </p>
              <p className="mb-8 text-sm font-bold text-white/40">
                Jonathan &amp; Cath Harris, Lead Pastors
              </p>
              <Link
                href="/about"
                className="rounded-full bg-destiny-orange px-8 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
              >
                Learn more About Us
              </Link>
            </AnimateIn>
          </div>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
