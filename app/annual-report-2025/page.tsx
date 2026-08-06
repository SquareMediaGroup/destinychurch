import type { Metadata } from "next";
import AnnualReportHero from "@/components/about/AnnualReportHero";
import AnnualReportHighlights from "@/components/about/AnnualReportHighlights";
import AnnualReportMinistries from "@/components/about/AnnualReportMinistries";
import AnnualReportFinances from "@/components/about/AnnualReportFinances";
import AnnualReportPastorNote from "@/components/about/AnnualReportPastorNote";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Annual Report 2025",
  description: "Destiny Church Tees Valley Annual Report 2025 — celebrating key milestones, baptisms, new members, ministries launched, and financial overview. A thank-you note from our lead pastors.",
  alternates: { canonical: "/annual-report-2025" },
  openGraph: {
    title: "Annual Report 2025 | Destiny Church Tees Valley",
    description: "Celebrating a year of faith, growth and community at Destiny Church.",
    url: "https://destinytees.uk/annual-report-2025",
    images: [{ url: "/og/annual-report-2025.webp", width: 1200, height: 630, alt: "Annual Report 2025 | Destiny Church Tees Valley" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/annual-report-2025.webp"],
  },
};

export default function AnnualReport2025Page() {
  return (
    <>
      <AnnualReportHero />
      <AnnualReportHighlights />
      <AnnualReportMinistries />
      <AnnualReportFinances />
      <AnnualReportPastorNote />
      <WorshipWithUsSection />
    </>
  );
}
