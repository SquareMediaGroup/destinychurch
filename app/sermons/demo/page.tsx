import Link from "next/link";
import PodcastPlayer from "@/components/PodcastPlayer";
import SermonSummary from "@/components/SermonSummary";
import TranscriptBlock from "@/components/TranscriptBlock";
import VideoPlayer from "@/components/VideoPlayer";
import { listSermons } from "@/lib/db";
import { Sermon } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const fallback: Sermon = {
  id: "demo-sermon",
  title: "Living Sent in Every Season",
  date: new Date().toISOString(),
  speaker: "Destiny Church",
  youtubeVideoId: "d6DiiHAGKMI",
  youtubePubDate: new Date().toISOString(),
  podcastAudioUrl:
    "https://media.destiny.example.com/sermons/2025-02-02-audio.mp3",
  thumbnailUrl: "/destiny-logo.svg",
  summary: [
    "- **Live sent:** the Holy Spirit sends us into workplaces, homes, and city streets with courage.",
    "- **Stay rooted:** _Acts 1:8_ reminds us that His power meets us in every season we walk through.",
    "- **Walk together:** pray, invite, and build with your Connect Group so no one carries the mission alone.",
  ].join("\n"),
  transcript:
    "Today we’re reminded that Jesus sends us into every season and space. The harvest is in our hands and homes...",
};

export default async function DemoSermonPage() {
  const sermons = await listSermons(1);
  const sermon = sermons[0] ?? fallback;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-destiny-black">
          {sermon.title}
        </h1>
        <Link href="/sermons" className="text-sm font-semibold text-destiny-orange">
          ← Back to sermons
        </Link>
      </div>

      <VideoPlayer
        sermonId={sermon.id}
        title={sermon.title}
        videoUrl={sermon.videoUrl}
        poster={sermon.thumbnailUrl}
        durationSeconds={sermon.durationSeconds}
        youtubeVideoId={sermon.youtubeVideoId}
      />

      {sermon.podcastAudioUrl && (
        <PodcastPlayer
          sermonId={sermon.id}
          title={sermon.title}
          audioUrl={sermon.podcastAudioUrl}
          durationSeconds={sermon.durationSeconds}
        />
      )}

      <SermonSummary summary={sermon.summary} />
      <TranscriptBlock transcript={sermon.transcript} />
    </div>
  );
}
