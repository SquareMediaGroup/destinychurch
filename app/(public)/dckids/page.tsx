import type { Metadata } from "next";
import KidsCampHero from "@/components/kids/KidsCampHero";
import KidsCampDetails from "@/components/kids/KidsCampDetails";
import KidsCampTeam from "@/components/kids/KidsCampTeam";
import KidsCampVideo from "@/components/kids/KidsCampVideo";
import KidsCampForm from "@/components/kids/KidsCampForm";
import KidsCampFAQ from "@/components/kids/KidsCampFAQ";

export const metadata: Metadata = {
  title: "Kids Camp 2026",
  description: "Destiny Kids Camp 2026 at Moor House Adventure Centre. A 3-day residential camp for Year 1-6 children featuring discipleship, worship, prayer and fun activities.",
  alternates: { canonical: "/dckids" },
  openGraph: {
    title: "Kids Camp 2026 | Destiny Church Tees Valley",
    description: "Join us for Destiny Kids Camp in May 2026 — 3 days of discipleship, worship and adventure for children in Year 1 to Year 6.",
    url: "https://destinytees.uk/dckids",
    images: [{ url: "/og/dckids.webp", width: 1200, height: 630, alt: "Kids Camp 2026 | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/dckids.webp"],
  },
};

export default function KidsCampPage() {
  return (
    <>
      <KidsCampHero />
      <KidsCampDetails />
      <div className="bg-white py-16" />
      <KidsCampTeam />
      <KidsCampVideo />
      <KidsCampForm />
      <KidsCampFAQ />
    </>
  );
}
