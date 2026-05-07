import type { Metadata } from "next";
import VisitSlideshow from "@/components/visit/VisitSlideshow";
import ServiceTimesSection from "@/components/visit/ServiceTimesSection";
import LocationSection from "@/components/visit/LocationSection";
import WhatToExpectSection from "@/components/visit/WhatToExpectSection";
import ParkingSection from "@/components/visit/ParkingSection";
import KidsMinistrySection from "@/components/visit/KidsMinistrySection";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Visit Us",
  description: "Join us for Sunday service at Destiny Church Tees Valley. Find service times, location, parking information, what to expect as a first-time visitor, and details about our kids ministry.",
  alternates: { canonical: "/visit" },
  openGraph: {
    title: "Visit Us | Destiny Church Tees Valley",
    description: "Join us this Sunday. Service times, location, parking info, and what to expect for first-time visitors.",
    url: "https://destinytees.uk/visit",
  },
};

export default function VisitPage() {
  return (
    <>
      <VisitSlideshow />
      <ServiceTimesSection />
      <WhatToExpectSection />
      <LocationSection />
      <ParkingSection />
      <KidsMinistrySection />
      <WorshipWithUsSection />
    </>
  );
}
