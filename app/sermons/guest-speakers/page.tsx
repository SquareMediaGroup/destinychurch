import type { Metadata } from "next";
import { getCollections } from "@/lib/collections";
import { getPlaylistVideos } from "@/lib/youtube";
import SermonCard from "@/components/sermons/SermonCard";

export const metadata: Metadata = {
  title: "Guest Speakers",
  description: "Watch sermons from guest speakers at Destiny Church Tees Valley.",
  alternates: { canonical: "/sermons/guest-speakers" },
  openGraph: {
    title: "Guest Speakers | Destiny Church Tees Valley",
    description: "Watch sermons from guest speakers at Destiny Church Tees Valley.",
    url: "https://destinytees.uk/sermons/guest-speakers",
  },
};

export const revalidate = 3600;

export default async function GuestSpeakersPage() {
  const collections = await getCollections("guest_speaker");
  const videos = (
    await Promise.all(
      collections.map((c) => getPlaylistVideos(c.youtube_playlist_id, 50))
    )
  ).flat();

  return (
    <>
      <div
        className="relative overflow-hidden pb-20 pt-52 text-center"
        style={{ background: "linear-gradient(135deg, #1a1108 0%, #0d0d0d 100%)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
        <div className="relative mx-auto max-w-3xl px-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-destiny-orange">
            Destiny Church
          </p>
          <h1 className="mb-4 text-5xl font-black text-white md:text-6xl lg:text-7xl">
            Guest Speakers
          </h1>
          <p className="text-base text-white/60 md:text-lg">
            Powerful messages from visiting ministers.
          </p>
        </div>
      </div>

      <section className="bg-[#111111] py-14">
        <div className="mx-auto max-w-7xl px-4 lg:px-8">
          {videos.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video) => (
                <SermonCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-white/40">No guest speaker sermons found.</p>
          )}
        </div>
      </section>
    </>
  );
}
