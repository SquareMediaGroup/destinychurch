import type { Metadata } from "next";
import Image from "next/image";
import AnimateIn from "@/components/AnimateIn";
import MinistryHero from "@/components/ministry/MinistryHero";
import SplitSection from "@/components/ministry/SplitSection";
import ImageMosaic from "@/components/ministry/ImageMosaic";
import AgeGroupCards, { type AgeGroup } from "@/components/ministry/AgeGroupCards";
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
    images: [{ url: "/og/youth.webp", width: 1200, height: 630, alt: "Destiny Youth | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/youth.webp"],
  },
};

const groups: AgeGroup[] = [
  {
    name: "KS3",
    ages: "11–14 years",
    tone: "orange",
    icon: "bolt",
    description: "The transition into secondary school is a big deal. KS3 is a safe, energetic space where young people can ask big questions, make real friends and discover who they are in God.",
  },
  {
    name: "KS4",
    ages: "14–16 years",
    tone: "blue",
    icon: "explore",
    description: "Identity, purpose and faith — the conversations that matter most. KS4 digs deeper into what it means to follow Jesus in the real world, navigating life with authenticity and courage.",
  },
  {
    name: "KS5",
    ages: "16–18 years",
    tone: "purple",
    icon: "rocket_launch",
    description: "On the edge of adulthood, KS5 is a community that prepares young people for what's ahead — faith-building, life skills, mentorship, and a genuine sense of calling and purpose.",
  },
];

export default function YouthPage() {
  return (
    <>
      <MinistryHero
        image="/img/photos/Youth Hero Background.webp"
        imageAlt="Young people at Destiny Youth"
        title="Destiny Youth"
        subtitle="A generation rising — passionate about God, life and each other."
        chips={[
          { icon: "calendar_month", label: "Every Wednesday" },
          { icon: "schedule", label: "7pm – 8:30pm" },
          { icon: "school", label: "Ages 11–18" },
        ]}
      />

      <SplitSection
        eyebrow="About Destiny Youth"
        title="More than a youth group"
        wideMedia
        media={
          <ImageMosaic
            wide
            images={[
              { src: "/img/photos/EHAP_Youth.webp", alt: "A young person at Destiny Youth" },
              { src: "/img/photos/Gallery/YouthCommunity.webp", alt: "Young people together at Destiny Youth" },
              { src: "/img/photos/Gallery/WorshipMoment3.webp", alt: "" },
            ]}
          />
        }
      >
        <p>
          Destiny Youth meets every Wednesday evening from 7pm to 8:30pm. It&apos;s an energetic, welcoming space for young people aged 11–18 to encounter God, build deep friendships and discover their purpose.
        </p>
        <p>
          We believe this generation has something incredible to offer the world. Our aim is to walk alongside them — through the highs and the hard times — and help them become everything God made them to be.
        </p>
      </SplitSection>

      <AgeGroupCards heading="For every age" groups={groups} />

      {/* Photo band — photographs only. This used to repeat three of the four
          shots from the intro, and the two Youth Alpha graphics that sat here
          are promo artwork, not photos; mixed in with photography they read as
          adverts, and the Alpha artwork already appears in the section below.
          Three distinct images beats four with duplicates. */}
      <section className="bg-[#f5f7fa] pb-20">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <AnimateIn>
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {[
                { src: "/img/photos/WorshipMoment1.webp", offset: false },
                { src: "/img/photos/Gallery/SingingLand2.webp", offset: true },
                { src: "/img/photos/Gallery/SingingLand3.webp", offset: false },
              ].map((img) => (
                <div
                  key={img.src}
                  className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-white sm:aspect-[4/5] ${img.offset ? "lg:mt-8" : ""}`}
                >
                  <Image
                    src={img.src}
                    alt=""
                    fill
                    sizes="(min-width: 640px) 31vw, 92vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      <YouthAlphaSection />

      <WorshipWithUsSection />
    </>
  );
}
