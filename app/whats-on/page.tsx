import type { Metadata } from "next";
import WhatsOnHero from "@/components/whats-on/WhatsOnHero";

export const metadata: Metadata = {
  title: "What's On",
  description: "See what's happening at Destiny Church Tees Valley — upcoming events, courses, Alpha, and highlights. There's always something on.",
  alternates: { canonical: "/whats-on" },
  openGraph: {
    title: "What's On | Destiny Church Tees Valley",
    description: "Upcoming events, courses and Alpha at Destiny Church Stockton-on-Tees.",
    url: "https://destinytees.uk/whats-on",
  },
};
import EventsGrid from "@/components/whats-on/EventsGrid";
import ConnectGroupsBanner from "@/components/whats-on/ConnectGroupsBanner";
import CoursesSection from "@/components/whats-on/CoursesSection";
import TogetherMissionSection from "@/components/whats-on/TogetherMissionSection";
import PastHighlightsSection from "@/components/whats-on/PastHighlightsSection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";
import { getFeaturedCourseId } from "@/lib/courses.server";
import { fetchChurchSuiteEvents } from "@destiny/shared";

export const revalidate = 300;

export default async function WhatsOnPage() {
  const [events, featuredCourseId] = await Promise.all([
    fetchChurchSuiteEvents({ next: { revalidate: 300 } }),
    getFeaturedCourseId(),
  ]);

  return (
    <>
      <WhatsOnHero />
      <EventsGrid events={events} />
      <ConnectGroupsBanner />
      <CoursesSection featuredId={featuredCourseId} />
      <TogetherMissionSection />
      <PastHighlightsSection />
      <WorshipWithUsSection />
    </>
  );
}
