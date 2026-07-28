// The body of the homepage, extracted so the real page and the variant preview
// route (/home) render identical markup with a different event-card treatment
// rather than duplicating the composition.

import HomeOverscrollColor from "@/components/home/HomeOverscrollColor";
import HeroSection from "@/components/home/HeroSection";
import MissionSection from "@/components/home/MissionSection";
import LatestSermonSection from "@/components/home/LatestSermonSection";
import WhatsOnSection from "@/components/home/WhatsOnSection";
import EveryoneHasAPlaceSection from "@/components/home/EveryoneHasAPlaceSection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import GetInvolvedSection from "@/components/home/GetInvolvedSection";
import { isYouTubeQuotaExceeded, getLatestVideoFromRSS, getLatestVideo } from "@/lib/youtube";
import type { EventCardVariant } from "@/lib/events";

export default async function HomePageBody({
  cardVariant = "a",
}: {
  cardVariant?: EventCardVariant;
}) {
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
      <WhatsOnSection cardVariant={cardVariant} />
      <EveryoneHasAPlaceSection />
      <WorshipWithUsSection />
      <GetInvolvedSection />
    </>
  );
}
