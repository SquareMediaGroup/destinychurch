import type { Metadata } from "next";
import CentenaryPage from "./CentenaryPage";

export const metadata: Metadata = {
  title: "100 Years — Destiny Church",
  description:
    "From a mission hall above a draper's shop on Norton Road in 1926 to a multi-cultural family of faith today — celebrate one hundred years of Destiny Church Tees Valley.",
  alternates: { canonical: "/100" },
  openGraph: {
    title: "100 Years of Destiny Church Tees Valley",
    description:
      "A century of faith, hope and love. Discover the story of our church — 1926 to 2026.",
    url: "https://destinytees.uk/100",
    type: "website",
  },
};

export default function Page() {
  return <CentenaryPage />;
}
