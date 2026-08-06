import type { Metadata } from "next";
import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import MinistryHero from "@/components/ministry/MinistryHero";
import SplitSection from "@/components/ministry/SplitSection";
import ImageMosaic from "@/components/ministry/ImageMosaic";
import FeatureGrid from "@/components/ministry/FeatureGrid";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Young Adults",
  description: "A community for 18–30s at Destiny Church Tees Valley. Events, meals, Connect Groups and doing life together — real friendships built outside of Sunday.",
  alternates: { canonical: "/young-adults" },
  openGraph: {
    title: "Young Adults | Destiny Church Tees Valley",
    description: "A community of 18–30s figuring out life, faith and everything in between. Based in Stockton-on-Tees.",
    url: "https://destinytees.uk/young-adults",
    images: [{ url: "/og/young-adults.webp", width: 1200, height: 630, alt: "Young Adults | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/young-adults.webp"],
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
      <MinistryHero
        image="/img/photos/YA1.webp"
        imageAlt="Young adults at Destiny Church"
        eyebrow="Community"
        title="Young Adults"
        subtitle="A community of 18–30s figuring out life, faith and everything in between."
        chips={[
          { icon: "group", label: "Ages 18–30" },
          { icon: "celebration", label: "Events & gatherings" },
        ]}
      />

      <SplitSection
        eyebrow="Who We Are"
        title="Life is better together"
        wideMedia
        media={
          <ImageMosaic
            wide
            images={[
              { src: "/img/photos/Gallery/YouthCommunity.webp", alt: "Young adults together at Destiny Church" },
              { src: "/img/photos/Community.webp", alt: "" },
              { src: "/img/photos/WorshipMoment1.webp", alt: "" },
            ]}
          />
        }
      >
        <p>
          Young Adults is a community for those aged 18 and over. We&apos;re not a programme — we&apos;re a group of people who genuinely want to know God and each other better.
        </p>
        <p>
          We don&apos;t have a fixed weekly schedule — instead we come together for events, meals, trips and gatherings throughout the year. If you want to be kept in the loop, join our Connect Group or get in touch and we&apos;ll add you to the group.
        </p>
      </SplitSection>

      <FeatureGrid heading="What We're About" items={values} />

      <SplitSection
        eyebrow="Events & Gatherings"
        title="We come together often"
        reverse
        wideMedia
        media={
          <ImageMosaic
            wide
            images={[
              { src: "/img/photos/WorshipMoment2.webp", alt: "" },
              { src: "/img/photos/ConnectGroups.webp", alt: "" },
              { src: "/img/photos/Gallery/SingingLand2.webp", alt: "" },
            ]}
          />
        }
      >
        <p>
          From spontaneous get-togethers to planned events throughout the year — there&apos;s always something happening. Meals, social nights, worship evenings, day trips and more.
        </p>
        <p>
          Keep an eye on our What&apos;s On page for upcoming events, or follow us on social media so you never miss what&apos;s next.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
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
      </SplitSection>

      {/* Connect Groups CTA */}
      <section
        className="relative overflow-hidden py-20"
        style={{ background: "linear-gradient(135deg, #363f48 0%, #242e37 100%)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 0%, rgba(245,128,33,0.16) 0%, rgba(245,128,33,0) 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center lg:px-8">
          <AnimateIn>
            <span
              aria-hidden
              className="material-symbols-rounded mb-4 block text-5xl leading-none text-destiny-orange"
            >
              group
            </span>
            <h2 className="mb-4 text-3xl font-black text-white md:text-4xl">
              Stay Connected
            </h2>
            <p className="mb-8 text-base leading-relaxed text-white/65">
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
