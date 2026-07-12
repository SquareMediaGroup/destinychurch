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
import { createServiceClient } from "@/utils/supabase/service";
import { isCourseId, type CourseId } from "@/lib/courses";

export const revalidate = 300;

type ChurchSuiteEvent = {
  id: number;
  name: string;
  datetime_start: string;
  datetime_end: string;
  location?: { name?: string } | null;
  images?: { original_500?: string; md?: string } | null;
  identifier?: string;
};

async function getEvents(): Promise<ChurchSuiteEvent[]> {
  try {
    const res = await fetch(
      "https://destinytees.churchsuite.com/embed/calendar/json",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function getFeaturedCourseId(): Promise<CourseId> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("featured_course")
      .select("course_id")
      .eq("id", 1)
      .maybeSingle();
    return isCourseId(data?.course_id) ? data.course_id : "bible_course";
  } catch {
    return "bible_course";
  }
}

export default async function WhatsOnPage() {
  const [events, featuredCourseId] = await Promise.all([
    getEvents(),
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
