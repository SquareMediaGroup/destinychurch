import Link from "next/link";
import AnimateIn from "@/components/AnimateIn";
import PastHighlightsSlideshow from "@/components/whats-on/PastHighlightsSlideshow";

const PLAYLIST_ID = "PLSS2B_vcLPmyLDmjyr6vWHSXKNmHvWNCU";

type Video = {
  videoId: string;
  title: string;
  thumbnail: string;
};

async function getPlaylistVideos(): Promise<Video[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return [];

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${PLAYLIST_ID}&maxResults=50&key=${apiKey}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();

    return (data.items ?? [])
      .filter((item: any) => item.snippet?.resourceId?.videoId)
      .map((item: any) => ({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails?.maxres?.url ||
          item.snippet.thumbnails?.high?.url ||
          item.snippet.thumbnails?.medium?.url ||
          `https://i.ytimg.com/vi/${item.snippet.resourceId.videoId}/hqdefault.webp`,
      }));
  } catch {
    return [];
  }
}

export default async function PastHighlightsSection() {
  const videos = await getPlaylistVideos();

  return (
    <section id="highlights" className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <AnimateIn>
          <h2 className="mb-10 text-center text-3xl font-black text-destiny-orange md:text-4xl">
            Past Event Highlights
          </h2>
        </AnimateIn>

        <AnimateIn delay={100}>
          <PastHighlightsSlideshow videos={videos} />
        </AnimateIn>

        <AnimateIn delay={200}>
          <div className="mt-8 text-center">
            <Link
              href={`https://www.youtube.com/playlist?list=${PLAYLIST_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border-2 border-destiny-orange px-8 py-3 text-sm font-bold text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
            >
              View All on YouTube
            </Link>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
