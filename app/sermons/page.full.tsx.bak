import type { Metadata } from "next";
import { getVisibleVideos } from "@/lib/sermons";
import SermonGrid from "@/components/sermons/SermonGrid";
import FeaturedSlideshow from "@/components/sermons/FeaturedSlideshow";

export const metadata: Metadata = {
  title: "Sermons",
  description:
    "Watch every sermon from Destiny Church Tees Valley. Bible-based messages available anytime.",
  alternates: { canonical: "/sermons" },
  openGraph: {
    title: "Sermons | Destiny Church Tees Valley",
    description:
      "Watch every sermon from Destiny Church Tees Valley. Bible-based messages available anytime.",
    url: "https://destinytees.uk/sermons",
  },
};

export const revalidate = 3600;

export default async function SermonsPage() {
  const videos = await getVisibleVideos(200);

  // Featured: latest sermon + 3 random picks from the rest
  const featured: typeof videos = [];
  if (videos.length > 0) {
    featured.push(videos[0]);
    const rest = videos.slice(1);
    const shuffled = rest.sort(() => Math.random() - 0.5);
    featured.push(...shuffled.slice(0, 3));
  }

  return (
    <>
      <h1 className="sr-only">Sermons — Destiny Church Tees Valley</h1>
      {/* Featured slideshow */}
      <FeaturedSlideshow slides={featured} />

      {/* Grid section */}
      <section className="bg-[#111111] py-14">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <SermonGrid videos={videos} />
        </div>
      </section>
    </>
  );
}
