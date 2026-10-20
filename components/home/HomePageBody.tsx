// The body of the homepage, extracted so app/page.tsx stays a thin route file.

import { Suspense } from "react";
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
import { getEventIndex } from "@/lib/events.server";

async function LatestSermon() {
  const quotaExceeded = await isYouTubeQuotaExceeded();
  const video = quotaExceeded
    ? await getLatestVideoFromRSS()
    : await getLatestVideo();
  return <LatestSermonSection video={video} quotaExceeded={quotaExceeded} />;
}

export default function HomePageBody() {
  // The two data-backed sections stream in behind their own boundaries. Both
  // sit well below the fold, and awaiting them here held back the hero (the
  // page's LCP element) until YouTube and the speaker-override and events
  // queries had all answered. Start the event feed now so it loads alongside
  // the video; getEventIndex is per-request cached, so the section picks up
  // this same promise.
  void getEventIndex();

  return (
    <>
      <HomeOverscrollColor />
      <HeroSection />
      <ServiceTimesBar />
      <MissionSection />
      <Suspense>
        <LatestSermon />
      </Suspense>
      <Suspense>
        <WhatsOnSection />
      </Suspense>
      <EveryoneHasAPlaceSection />
      <WorshipWithUsSection />
      <GetInvolvedSection />
    </>
  );
}
