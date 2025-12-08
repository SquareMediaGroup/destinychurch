import Link from "next/link";
import PodcastPlayer from "@/components/PodcastPlayer";
import SermonSummary from "@/components/SermonSummary";
import TranscriptBlock from "@/components/TranscriptBlock";
import VideoPlayer from "@/components/VideoPlayer";
import SermonCard from "@/components/SermonCard";
import { getSermonByViewId, listSermons } from "@/lib/db";
import { Sermon } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SermonViewPageProps = {
  searchParams?: { viewId?: string; debug?: string };
};

const fallbackSermon: Sermon = {
  id: "demo-sermon",
  title: "Living Sent in Every Season",
  date: new Date().toISOString(),
  speaker: "Destiny Church",
  youtubeVideoId: "d6DiiHAGKMI",
  youtubePubDate: new Date().toISOString(),
  podcastAudioUrl:
    "https://media.destiny.example.com/sermons/2025-02-02-audio.mp3",
  thumbnailUrl: "/destiny-logo.svg",
  summary:
    "A warm, Christ-centred call to live sent in workplaces, homes, and city streets, trusting the Holy Spirit to open doors.",
  transcript:
    "Today we’re reminded that Jesus sends us into every season and space. The harvest is in our hands and homes...",
};

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateString));

export default async function SermonViewPage({ searchParams }: SermonViewPageProps) {
  const viewIdRaw = searchParams?.viewId ?? "";
  const viewId = viewIdRaw ? decodeURIComponent(viewIdRaw).trim() : "";
  const debugMode = searchParams?.debug === "1";

  const tryIds = [
    viewId,
    viewIdRaw,
    viewId ? viewId.replace(/\s+/g, "") : "",
    viewIdRaw ? viewIdRaw.replace(/\s+/g, "") : "",
  ].filter(Boolean);

  let sermon = null as Sermon | null;
  let matchedField: string | null = null;
  for (const candidate of tryIds) {
    const result = await getSermonByViewId(candidate);
    sermon = result.sermon;
    matchedField = result.matchedField;
    if (sermon) break;
  }

  const allSermons = await listSermons(100);

  const resolvedSermon = sermon ?? (viewId ? null : allSermons[0] ?? fallbackSermon);

  if (!resolvedSermon) {
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
    .filter((item) => item.id !== resolvedSermon.id)
    .slice(0, 2);

  return (
    <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-black/5 bg-white px-4 py-3 text-xs font-semibold text-destiny-grey">
          <span>View ID: {viewId || "none"}</span>
          {viewId && (
            <Link
              href={`/sermons/view?viewId=${encodeURIComponent(viewId)}&debug=${debugMode ? "0" : "1"}`}
              className="rounded-full border border-destiny-orange px-3 py-1 text-destiny-orange transition hover:bg-destiny-orange hover:text-white"
            >
              {debugMode ? "Exit debug" : "Enable debug"}
            </Link>
          )}
        </div>

        {debugMode && (
          <div className="space-y-1 rounded-xl border border-black/5 bg-white px-4 py-3 text-xs text-destiny-grey shadow-sm">
            <p className="font-semibold text-destiny-black">Debug info</p>
            <p>Raw viewId: {viewIdRaw || "—"}</p>
            <p>Decoded viewId: {viewId || "—"}</p>
            <p>Matched field: {matchedField || "none"}</p>
            <p>Resolved sermon: {resolvedSermon.id} — {resolvedSermon.title}</p>
            <p>Try order: {tryIds.join(", ") || "none"}</p>
          </div>
        )}

        <div className="space-y-3">
          <VideoPlayer
            sermonId={resolvedSermon.id}
            title={resolvedSermon.title}
            videoUrl={resolvedSermon.videoUrl}
            poster={resolvedSermon.thumbnailUrl}
            durationSeconds={resolvedSermon.durationSeconds}
            youtubeVideoId={resolvedSermon.youtubeVideoId}
          />
          {resolvedSermon.podcastAudioUrl && (
            <PodcastPlayer
              sermonId={resolvedSermon.id}
              title={resolvedSermon.title}
              audioUrl={resolvedSermon.podcastAudioUrl}
              durationSeconds={resolvedSermon.durationSeconds}
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
              {resolvedSermon.title}
            </h1>
            <p className="text-sm text-destiny-grey">
              {formatDate(resolvedSermon.date)} · {resolvedSermon.speaker || "Destiny Church"}
            </p>
            <div className="flex flex-wrap gap-2">
              {resolvedSermon.tags?.map((tag) => (
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

        <SermonSummary summary={resolvedSermon.summary} />
        <TranscriptBlock transcript={resolvedSermon.transcript} />
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
