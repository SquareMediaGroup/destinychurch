import type { Metadata } from "next";
import CentennialHero from "@/components/centennial/CentennialHero";
import CentennialIntro from "@/components/centennial/CentennialIntro";
import CentennialTimeline from "@/components/centennial/CentennialTimeline";
import CentennialPastors from "@/components/centennial/CentennialPastors";
import CentennialStats from "@/components/centennial/CentennialStats";
import CentennialNext from "@/components/centennial/CentennialNext";

export const metadata: Metadata = {
  title: "100 Years — Our Story",
  description:
    "From a small mission hall on Norton Road in 1926 to a multi-cultural family of faith today — celebrate one hundred years of Destiny Church Tees Valley.",
  alternates: { canonical: "/centennial" },
  openGraph: {
    title: "100 Years of Destiny Church Tees Valley",
    description:
      "A century of faith, hope and love. Discover the story of our church — 1926 to 2026.",
    url: "https://destinytees.uk/centennial",
  },
};

export default function CentennialPage() {
  return (
    <>
      <CentennialHero />
      <CentennialIntro />
      <CentennialTimeline />
      <CentennialPastors />
      <CentennialStats />
      <CentennialNext />
    </>
  );
}
