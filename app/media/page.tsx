import type { Metadata } from "next";
import { getPublicBoards } from "@/lib/media.server";
import MediaHero from "@/components/media/MediaHero";
import BoardGrid from "@/components/media/BoardGrid";
import WorshipWithUsSection from "@/components/home/WorshipWithUsSection";

export const metadata: Metadata = {
  title: "Photos",
  description:
    "Browse photos from Destiny Church services and events, and share your own.",
  alternates: { canonical: "/media" },
  openGraph: {
    title: "Photos | Destiny Church Tees Valley",
    description: "Browse photos from services and events, and share your own.",
    url: "https://destinytees.uk/media",
  },
};

// Photos get approved occasionally, not real-time-critical — five minutes
// keeps the board list reasonably fresh without hitting the DB on every visit.
export const revalidate = 300;

export default async function MediaPage() {
  const boards = await getPublicBoards();

  return (
    <>
      <MediaHero />
      <BoardGrid boards={boards} />
      <WorshipWithUsSection />
    </>
  );
}
