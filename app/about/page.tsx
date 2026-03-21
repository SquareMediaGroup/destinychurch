import AboutHero from "@/components/about/AboutHero";
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
