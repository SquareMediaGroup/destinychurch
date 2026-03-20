import HeroSection from "@/components/home/HeroSection";
import MissionSection from "@/components/home/MissionSection";
import WhatsOnSection from "@/components/home/WhatsOnSection";
import EveryoneHasAPlaceSection from "@/components/home/EveryoneHasAPlaceSection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import GetInvolvedSection from "@/components/home/GetInvolvedSection";

export const revalidate = 30;

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <MissionSection />
      <WhatsOnSection />
      <EveryoneHasAPlaceSection />
      <WorshipWithUsSection />
      <GetInvolvedSection />
    </>
  );
}
