import type { Metadata } from "next";
import HeroSection from "@/components/home/HeroSection";

export const metadata: Metadata = {
  title: "Destiny Church Tees Valley — Sundays at 11am in Stockton-on-Tees",
  description: "A warm, multi-cultural church meeting every Sunday at 11am at Destiny Centre, Norton Road, Stockton-on-Tees. Everyone is welcome — come as you are.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Destiny Church Tees Valley",
    description: "A warm, multi-cultural church meeting every Sunday at 11am. Everyone is welcome.",
    url: "https://destinytees.uk",
  },
};
import HomeOverscrollColor from "@/components/home/HomeOverscrollColor";
import MissionSection from "@/components/home/MissionSection";
import LatestSermonSection from "@/components/home/LatestSermonSection";
import WhatsOnSection from "@/components/home/WhatsOnSection";
import EveryoneHasAPlaceSection from "@/components/home/EveryoneHasAPlaceSection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import GetInvolvedSection from "@/components/home/GetInvolvedSection";
import { isYouTubeQuotaExceeded, getLatestVideoFromRSS, getLatestVideo } from "@/lib/youtube";

export const revalidate = 30;

export default async function HomePage() {
  const quotaExceeded = await isYouTubeQuotaExceeded();
  const video = quotaExceeded
    ? await getLatestVideoFromRSS()
    : await getLatestVideo();

  return (
    <>
      <HomeOverscrollColor />
      <HeroSection />
      <MissionSection />
      <LatestSermonSection video={video} quotaExceeded={quotaExceeded} />
      <WhatsOnSection />
      <EveryoneHasAPlaceSection />
      <WorshipWithUsSection />
      <GetInvolvedSection />
    </>
  );
}
