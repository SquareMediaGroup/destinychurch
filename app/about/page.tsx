import type { Metadata } from "next";
import AboutHero from "@/components/about/AboutHero";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about Destiny Church Tees Valley — our mission, our five foundational pillars, our lead pastors Jonathan & Cath Harris, and the team behind the church.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Destiny Church Tees Valley",
    description: "Our mission: transforming lives through Faith, Hope and Love for Jesus. Meet our pastors and team.",
    url: "https://destinytees.uk/about",
  },
};
import AboutMissionStatement from "@/components/about/AboutMissionStatement";
import MeetPastorsSection from "@/components/about/MeetPastorsSection";
import TeamSection from "@/components/about/TeamSection";
import BeliefsSection from "@/components/about/BeliefsSection";
import MagnifySection from "@/components/about/MagnifySection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutMissionStatement />
      <MeetPastorsSection />
      <TeamSection />
      <BeliefsSection />
      <MagnifySection />
      <WorshipWithUsSection />
    </>
  );
}
