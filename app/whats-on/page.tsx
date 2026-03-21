import WhatsOnHero from "@/components/whats-on/WhatsOnHero";
import EventsGrid from "@/components/whats-on/EventsGrid";
import ConnectGroupsBanner from "@/components/whats-on/ConnectGroupsBanner";
import CoursesSection from "@/components/whats-on/CoursesSection";
import TogetherMissionSection from "@/components/whats-on/TogetherMissionSection";
import PastHighlightsSection from "@/components/whats-on/PastHighlightsSection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

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

export default async function WhatsOnPage() {
  const events = await getEvents();

  return (
    <>
      <WhatsOnHero />
      <EventsGrid events={events} />
      <ConnectGroupsBanner />
      <CoursesSection />
      <TogetherMissionSection />
      <PastHighlightsSection />
      <WorshipWithUsSection />
    </>
  );
}
