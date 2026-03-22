import type { Metadata } from "next";
import { getVisibleVideos } from "@/lib/sermons";
import SermonGrid from "@/components/sermons/SermonGrid";

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
  const videos = await getVisibleVideos(50);

  return (
    <>
      {/* Hero */}
      <div
        className="relative overflow-hidden py-28 text-center"
        style={{ background: "linear-gradient(135deg, #1a1108 0%, #0d0d0d 100%)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
        <div className="relative mx-auto max-w-3xl px-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
            Destiny Church
          </p>
          <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">
            Sermons
          </h1>
          <p className="text-base text-white/60 md:text-lg">
            Every message, any time.
          </p>
        </div>
      </div>

      {/* Grid section */}
      <section className="bg-[#111111] py-14">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          <SermonGrid videos={videos} />
        </div>
      </section>
    </>
  );
}
