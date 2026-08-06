import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import MinistryHero from "@/components/ministry/MinistryHero";
import SplitSection from "@/components/ministry/SplitSection";
import ImageMosaic from "@/components/ministry/ImageMosaic";
import FactStrip from "@/components/ministry/FactStrip";
import AgeGroupCards, { type AgeGroup } from "@/components/ministry/AgeGroupCards";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Destiny Kids",
  description: "Destiny Kids runs every Sunday from 10:45am for children aged 0–11 at Destiny Church Stockton-on-Tees. Safe, fun and faith-filled classes for every age group.",
  alternates: { canonical: "/kids" },
  openGraph: {
    title: "Destiny Kids | Destiny Church Tees Valley",
    description: "Fun, safe and faith-filled Sunday classes for children aged 0–11. Led by DBS-checked volunteers who love little ones.",
    url: "https://destinytees.uk/kids",
    images: [{ url: "/og/kids.webp", width: 1200, height: 630, alt: "Destiny Kids | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/kids.webp"],
  },
};

const classes: AgeGroup[] = [
  {
    name: "Babies & Toddlers",
    ages: "0–1 years",
    tone: "orange",
    icon: "child_care",
    description: "Parents of our youngest ones are warmly invited to enjoy the service from our dedicated balcony area above the main auditorium — a comfortable space to watch and worship while keeping your baby close.",
    detail: "Balcony above the main auditorium",
  },
  {
    name: "Destiny Tots",
    ages: "2–4 years",
    tone: "blue",
    icon: "emoji_people",
    description: "A warm, nurturing environment where our youngest children explore Bible stories, crafts and play in age-appropriate ways. Staffed by trained, DBS-checked volunteers who love little ones.",
    detail: "Tots Room",
  },
  {
    name: "KS1 Class",
    ages: "5–7 years",
    tone: "green",
    icon: "menu_book",
    description: "Fun, engaging sessions combining worship, Bible teaching, games and creative activities. Children learn about God's love in a way that sparks their imagination and builds their faith.",
    detail: "Kids Room",
  },
  {
    name: "KS2 Class",
    ages: "8–11 years",
    tone: "purple",
    icon: "star",
    description: "Deeper Bible exploration, discussion and activities for older children. This group is a safe, exciting space for kids to ask questions, grow in faith and build friendships that last.",
    detail: "Kids Room",
  },
];

const facts = [
  {
    icon: "calendar_month",
    label: "When",
    value: "Every Sunday",
    note: "10:45am – 12:30pm. Children are welcomed during the main service.",
  },
  {
    icon: "location_on",
    label: "Where",
    value: "Destiny Centre",
    note: "Norton Road, Stockton-on-Tees, TS20 2QQ",
  },
  {
    icon: "free_cancellation",
    label: "Cost",
    value: "Completely free",
    note: "No registration required — just bring the kids and we'll take care of the rest.",
  },
];

export default function KidsPage() {
  return (
    <>
      <MinistryHero
        image="/img/photos/parachute-kids.webp"
        imageAlt="Children playing with a parachute at Destiny Kids"
        title="Destiny Kids"
        subtitle="A place where every child belongs, grows and encounters God."
        objectPosition="top"
        chips={[
          { icon: "calendar_month", label: "Every Sunday" },
          { icon: "schedule", label: "10:45am – 12:30pm" },
          { icon: "child_care", label: "Ages 0–11" },
        ]}
      />

      <SplitSection
        eyebrow="About Destiny Kids"
        title="Faith starts young"
        wideMedia
        media={
          <ImageMosaic
            wide
            images={[
              { src: "/img/photos/portrait-kids.webp", alt: "A child at Destiny Kids" },
              { src: "/img/photos/Kids2.webp", alt: "Destiny Kids in class" },
              { src: "/img/photos/Kids3.webp", alt: "" },
            ]}
          />
        }
      >
        <p>
          Destiny Kids runs every Sunday from 10:45am to 12:30pm, giving children aged 0–11 their own exciting, age-appropriate experience of church. Our classes are designed to make faith real, relevant and fun for every child.
        </p>
        <p>
          All of our leaders are DBS-checked and trained, and we take the safety and wellbeing of every child seriously. Destiny Kids is a safe, nurturing space where children can encounter God for themselves.
        </p>
      </SplitSection>

      <FactStrip facts={facts} />

      <AgeGroupCards
        heading="Our Classes"
        subheading="Something for every age — from babies to year 6"
        groups={classes}
        tone="light"
      />

      <SplitSection
        eyebrow="Free Event"
        title="Tots Mornings"
        tone="dark"
        reverse
        wideMedia
        media={
          <ImageMosaic
            wide
            images={[
              { src: "/img/photos/portrait-kids-3.webp", alt: "A toddler at Tots Mornings" },
              { src: "/img/photos/wide-kids.webp", alt: "Tots Mornings play session" },
              { src: "/img/photos/Gallery/FamilySatTogether.webp", alt: "" },
            ]}
          />
        }
      >
        <p>
          Our Tots Mornings are a free, welcoming gathering for parents and their little ones aged 0–4. It&apos;s a relaxed morning of play, songs and community — a great chance to meet other parents and connect with the Destiny family.
        </p>
        <div className="grid gap-4 pt-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5">
            <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-orange">
              When
            </p>
            <p className="font-bold text-white">1st &amp; 3rd Sunday morning</p>
            <p className="text-sm text-white/55">of every month</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5">
            <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-orange">
              Where
            </p>
            <p className="font-bold text-white">Tots Room</p>
            <p className="text-sm text-white/55">Destiny Centre</p>
          </div>
        </div>
        <div className="pt-2">
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full bg-destiny-orange px-7 py-3 text-sm font-bold text-white shadow-lg shadow-destiny-orange/25 transition hover:brightness-110"
          >
            Find out more
          </Link>
        </div>
      </SplitSection>

      {/* Kids Pastor */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <div className="flex flex-col gap-8 rounded-[20px] border border-black/[0.07] p-8 shadow-[0_1px_2px_rgba(16,24,40,.04),0_8px_24px_-8px_rgba(16,24,40,.10)] sm:flex-row sm:items-center sm:gap-10 lg:p-10">
              <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-3xl bg-[#f5f7fa]">
                <Image
                  src="/img/brand/Team/FA.webp"
                  alt="Funke Awojide"
                  fill
                  sizes="160px"
                  className="object-contain"
                />
              </div>
              <div>
                <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.09em] text-destiny-orange">
                  Meet the Kids Pastor
                </p>
                <h2
                  style={{ fontFamily: "var(--font-roboto)" }}
                  className="mb-3 text-[28px] font-semibold leading-[1.12] tracking-[-0.022em] text-destiny-grey"
                >
                  Funke Awojide
                </h2>
                <p className="mb-4 text-base leading-relaxed text-destiny-grey/70">
                  Funke leads our Destiny Kids ministry with passion and dedication. She and her team create a safe, fun and faith-filled environment where every child can experience God&apos;s love and grow in their faith.
                </p>
                <p className="text-sm text-destiny-grey/45">
                  Kids Pastor ·{" "}
                  <a
                    href="mailto:funke@destinytees.uk"
                    className="font-semibold text-destiny-orange underline underline-offset-4 transition hover:text-destiny-orange-dark"
                  >
                    funke@destinytees.uk
                  </a>
                </p>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      <WorshipWithUsSection />
    </>
  );
}
