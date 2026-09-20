// The body of the homepage, extracted so app/page.tsx stays a thin route file.

import HomeOverscrollColor from "@/components/home/HomeOverscrollColor";
import HeroSection from "@/components/home/HeroSection";
import ServiceTimesBar from "@/components/home/ServiceTimesBar";
import MissionSection from "@/components/home/MissionSection";
import LatestSermonSection from "@/components/home/LatestSermonSection";
import WhatsOnSection from "@/components/home/WhatsOnSection";
import EveryoneHasAPlaceSection from "@/components/home/EveryoneHasAPlaceSection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import GetInvolvedSection from "@/components/home/GetInvolvedSection";
import { isYouTubeQuotaExceeded, getLatestVideoFromRSS } from "@/lib/youtube";
import { getLatestVideo } from "@/lib/speakerOverrides.server";

export default async function HomePageBody() {
  const quotaExceeded = await isYouTubeQuotaExceeded();
  const video = quotaExceeded
    ? await getLatestVideoFromRSS()
    : await getLatestVideo();

  return (
    <>
      <HomeOverscrollColor />
      <HeroSection />
      <ServiceTimesBar />
      <MissionSection />
      <LatestSermonSection video={video} quotaExceeded={quotaExceeded} />
      <WhatsOnSection />
      <EveryoneHasAPlaceSection />
      <WorshipWithUsSection />
      <GetInvolvedSection />
    </>
  );
}
