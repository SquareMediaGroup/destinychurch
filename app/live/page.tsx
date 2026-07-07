import type { Metadata } from "next";
import { getLiveStatus, getLatestVideo } from "@/lib/youtube";
import LiveExperience from "@/components/live/LiveExperience";

export const metadata: Metadata = {
  title: "Watch Live",
  description:
    "Watch Destiny Church Tees Valley live, Sundays at 11am — join us online in real time.",
  alternates: { canonical: "/live" },
  openGraph: {
    title: "Watch Live | Destiny Church Tees Valley",
    description: "Join Destiny Church Tees Valley live, Sundays at 11am.",
    url: "https://destinytees.uk/live",
  },
};

export const revalidate = 60;

export default async function LivePage() {
  const [status, latestSermon] = await Promise.all([
    getLiveStatus(),
    getLatestVideo(),
  ]);

  return (
    <LiveExperience
      initialLive={status.live}
      initialVideoId={status.videoId}
      latestSermon={latestSermon}
    />
  );
}
