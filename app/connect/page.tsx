import type { Metadata } from "next";
import Image from "next/image";
import MinistryHero from "@/components/ministry/MinistryHero";
import SplitSection from "@/components/ministry/SplitSection";
import FeatureGrid from "@/components/ministry/FeatureGrid";
import FormSection from "@/components/ministry/FormSection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Connect Groups",
  description: "Join a Connect Group at Destiny Church Tees Valley. Small groups meeting throughout the week — a place to build real friendships, grow in faith and do life together.",
  alternates: { canonical: "/connect" },
  openGraph: {
    title: "Connect Groups | Destiny Church Tees Valley",
    description: "Find your people. Join a Connect Group and do life together with others in Stockton-on-Tees and beyond.",
    url: "https://destinytees.uk/connect",
    images: [{ url: "/og/connect.webp", width: 1200, height: 630, alt: "Connect Groups | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/connect.webp"],
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
      <MinistryHero
        image="/img/photos/ConnectGroups.webp"
        imageAlt="A Connect Group meeting together"
        eyebrow="Community"
        title="Connect Groups"
        subtitle="Find your people. Do life together."
        chips={[
          { icon: "event_repeat", label: "Throughout the week" },
          { icon: "diversity_3", label: "All ages & stages" },
        ]}
      />

      <SplitSection
        eyebrow="What are Connect Groups?"
        title="Church is more than Sunday"
        reverse
        media={
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[#f5f7fa]">
            <Image
              src="/img/photos/Community.webp"
              alt="Connect Groups community"
              fill
              sizes="(min-width: 1024px) 42vw, 92vw"
              className="object-cover"
            />
          </div>
        }
      >
        <p>
          Connect Groups are small groups of people who meet regularly throughout the week
          to pray, study the Bible, support one another and do life together. They are the
          heartbeat of Destiny Church.
        </p>
        <p>
          We believe that real growth happens in community — not just in a Sunday service.
          Connect Groups are where you can be known, find accountability, and experience
          the fullness of what it means to be part of the Destiny family.
        </p>
      </SplitSection>

      <FeatureGrid heading="Why Join a Connect Group?" items={perks} />

      <FormSection
        eyebrow="Get Connected"
        title="Join a Connect Group"
        subtitle="Fill in the form below and we'll match you with the right group for you."
        src="https://destinytees.churchsuite.com/forms/twuneiil"
        formTitle="Connect Group sign up"
        height={750}
      />

      <WorshipWithUsSection />
    </>
  );
}
