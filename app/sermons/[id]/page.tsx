import Link from "next/link";
import SermonSummary from "@/components/SermonSummary";
import TranscriptBlock from "@/components/TranscriptBlock";
import VideoPlayer from "@/components/VideoPlayer";
import SermonCard from "@/components/SermonCard";
import {
  getSermonById,
  getSermonByYoutubeId,
  listSermons,
} from "@/lib/db";
import PodcastPlayer from "@/components/PodcastPlayer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SermonWatchPageProps = {
  params: { id: string };
};

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));

export default async function SermonWatchPage({ params }: SermonWatchPageProps) {
  const rawParam = params.id;
  const decodedId = decodeURIComponent(rawParam).trim();

  const tryIds = [
    decodedId,
    rawParam,
    decodedId.replace(/\s+/g, ""),
    rawParam.replace(/\s+/g, ""),
  ].filter(Boolean);

  let sermon: Awaited<ReturnType<typeof getSermonById>> = null;
  for (const candidate of tryIds) {
    sermon = await getSermonById(candidate);
    if (sermon) break;
  }

  // Fallback: if not found, try matching by YouTube video ID suffix
  if (!sermon) {
    const youtubeId =
      decodedId.includes(":") || decodedId.includes("%3A")
        ? decodedId.split(":").pop() ?? decodedId
        : decodedId;
    sermon = await getSermonByYoutubeId(youtubeId);
  }

  const allSermons = await listSermons(100);
  if (!sermon) {
    sermon =
      allSermons.find((s) => s.id === decodedId) ||
      allSermons.find((s) => s.id === rawParam) ||
      allSermons.find((s) => s.youtubeVideoId === decodedId) ||
      allSermons.find((s) => s.youtubeVideoId === rawParam) ||
      null;
  }

  if (!sermon) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-black/5 bg-white px-6 py-8 shadow-sm">
          <h1 className="text-2xl font-bold text-destiny-black">Sermon not found</h1>
          <p className="mt-2 text-destiny-grey">
            We could not locate this sermon. Please select another from the list.
          </p>
          <Link href="/sermons" className="mt-4 inline-block text-destiny-orange font-semibold">
            ← Back to sermons
          </Link>
        </div>
      </div>
    );
  }

  const recommended = allSermons
    .filter((item) => item.id !== sermon.id)
    .slice(0, 2);

  return (
    <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <div className="space-y-3">
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
          <div className="space-y-1 px-1">
            <Link
              href="/sermons"
              className="text-sm font-semibold text-destiny-orange"
            >
              ← All sermons
            </Link>
            <h1 className="text-3xl font-bold text-destiny-black">
              {sermon.title}
            </h1>
            <p className="text-sm text-destiny-grey">
              {formatDate(sermon.date)} · {sermon.speaker || "Destiny Church"}
            </p>
            <div className="flex flex-wrap gap-2">
              {sermon.tags?.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-destiny-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-destiny-blue"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <SermonSummary summary={sermon.summary} />
        <TranscriptBlock transcript={sermon.transcript} />
      </div>

      <aside className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-destiny-black">
            Recommended
          </h2>
          <span className="text-xs uppercase tracking-wide text-destiny-grey/70">
            YouTube-style grid
          </span>
        </div>
        <div className="grid gap-4">
          {recommended.map((sermon) => (
            <SermonCard key={sermon.id} sermon={sermon} />
          ))}
        </div>
      </aside>
    </div>
  );
}
