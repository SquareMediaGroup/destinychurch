// The body of /whats-on, extracted so the page and the variant preview route
// (/whats-on/new) render identical markup with a different card treatment
// rather than duplicating the composition.

import WhatsOnHero from "@/components/whats-on/WhatsOnHero";
import EventsGrid from "@/components/events/EventsGrid";
import FeaturedEventHero from "@/components/events/FeaturedEventHero";
import ConnectGroupsBanner from "@/components/whats-on/ConnectGroupsBanner";
import CoursesSection from "@/components/whats-on/CoursesSection";
import TogetherMissionSection from "@/components/whats-on/TogetherMissionSection";
import PastHighlightsSection from "@/components/whats-on/PastHighlightsSection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import { getFeaturedCourseId } from "@/lib/courses.server";
import { getEventIndex, getFeaturedEvent } from "@/lib/events.server";
import { groupSeriesByMonth } from "@destiny/shared";
import type { EventCardVariant } from "@/lib/events";

export default async function WhatsOnPageBody({
  cardVariant = "a",
}: {
  cardVariant?: EventCardVariant;
}) {
  const [index, featuredCourseId] = await Promise.all([
    getEventIndex(),
    getFeaturedCourseId(),
  ]);
  const featuredEvent = await getFeaturedEvent(index);

  // Grouped on the server: the grid must never decide what "upcoming" means,
  // or it will disagree with the server it hydrated from.
  const groups = groupSeriesByMonth(index.series);

  return (
    <>
      <WhatsOnHero />
      {/* Outside the #events section on purpose — ChurchHeader, the footer and
          the sitemap all deep-link to #events, which must still land on the
          grid rather than on the banner. */}
      <FeaturedEventHero featured={featuredEvent} />
      <EventsGrid groups={groups} variant={cardVariant} />
      <ConnectGroupsBanner />
      <CoursesSection featuredId={featuredCourseId} />
      <TogetherMissionSection />
      <PastHighlightsSection />
      <WorshipWithUsSection />
    </>
  );
}
