import AboutHero from "@/components/about/AboutHero";
import MissionSection from "@/components/home/MissionSection";
import MeetPastorsSection from "@/components/about/MeetPastorsSection";
import TeamSection from "@/components/about/TeamSection";
import BeliefsSection from "@/components/about/BeliefsSection";
import MagnifySection from "@/components/about/MagnifySection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <MissionSection />
      <MeetPastorsSection />
      <TeamSection />
      <BeliefsSection />
      <MagnifySection />
      <WorshipWithUsSection />
    </>
  );
}
