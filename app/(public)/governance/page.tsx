import type { Metadata } from "next";
import { getGovernanceData } from "@/lib/governance.server";
import GovernanceHero from "@/components/governance/GovernanceHero";
import RegistrationCards from "@/components/governance/RegistrationCards";
import CharitableObjects from "@/components/governance/CharitableObjects";
import TrusteesDirectors from "@/components/governance/TrusteesDirectors";
import FinancialHistory from "@/components/governance/FinancialHistory";
import FilingHistory from "@/components/governance/FilingHistory";
import GovernanceSourceNote from "@/components/governance/GovernanceSourceNote";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Governance & Registration",
  description:
    "Destiny Church Tees Valley is registered charity 1119951 and company 06261423. See our trustees, directors, charitable objects, financial history and filings, taken live from the public registers.",
  alternates: { canonical: "/governance" },
  openGraph: {
    title: "Governance & Registration | Destiny Church Tees Valley",
    description:
      "Our charity and company registration details, trustees, finances and filings — drawn directly from the Charity Commission and Companies House registers.",
    url: "https://destinytees.uk/governance",
    images: [
      {
        url: "/og/about.webp",
        width: 1200,
        height: 630,
        alt: "Destiny Church Tees Valley governance and registration",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og/about.webp"],
  },
};

// Weekly. Registry data changes a handful of times a year, and both APIs are
// rate-limited per key, so there is nothing to gain from checking more often.
export const revalidate = 604800;

export default async function GovernancePage() {
  const { company, charity, sources, fetchedAt } = await getGovernanceData();

  return (
    <>
      <GovernanceHero />
      <RegistrationCards
        profile={company.profile}
        details={charity.details}
      />
      <CharitableObjects details={charity.details} />
      <TrusteesDirectors
        trustees={charity.trustees}
        officers={company.officers}
      />
      <FinancialHistory financials={charity.financials} />
      <FilingHistory
        filings={company.filings}
        submissions={charity.submissions}
      />
      <GovernanceSourceNote sources={sources} fetchedAt={fetchedAt} />
      <WorshipWithUsSection />
    </>
  );
}
