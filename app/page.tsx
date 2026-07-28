import type { Metadata } from "next";
import HomePageBody from "@/components/home/HomePageBody";

export const metadata: Metadata = {
  title: "Destiny Church Tees Valley — Sundays at 11am in Stockton-on-Tees",
  description: "A warm, multi-cultural church meeting every Sunday at 11am at Destiny Centre, Norton Road, Stockton-on-Tees. Everyone is welcome — come as you are.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Destiny Church Tees Valley",
    description: "A warm, multi-cultural church meeting every Sunday at 11am. Everyone is welcome.",
    url: "https://destinytees.uk",
  },
};

export const revalidate = 30;

export default async function HomePage() {
  return <HomePageBody cardVariant="a" />;
}
