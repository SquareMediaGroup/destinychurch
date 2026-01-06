import type { Metadata } from "next";
import Link from "next/link";
import PodcastPlayer from "@/components/PodcastPlayer";
import SermonSummary from "@/components/SermonSummary";
import SermonPoints from "@/components/SermonPoints";
import TranscriptBlock from "@/components/TranscriptBlock";
import VideoPlayer from "@/components/VideoPlayer";
import SermonCard from "@/components/SermonCard";
import SermonDebugPanel from "@/components/SermonDebugPanel";
import { getSermonByViewId, listSermonsLite } from "@/lib/db";
import { Sermon } from "@/lib/types";
import { getViewId } from "@/lib/viewIds";
import { tryGetSupabaseAdmin } from "@/lib/supabase";
import { getTranscriptSegments } from "@/lib/transcriptSegments";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const viewport = {
  width: "device-width",
  initialScale: 1,
};

const transcriptsDisabled = false;

type SearchParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

type SermonViewPageProps = {
  searchParams?:
    | Promise<SearchParamsLike | null | undefined>
    | SearchParamsLike
    | null
    | undefined;
};

const getQueryValue = (
  params: SearchParamsLike | null | undefined,
  key: string,
): string => {
  if (!params) return "";
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? "";
  }
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const buildViewIdCandidates = (viewId: string, viewIdRaw: string) =>
  [
    viewId,
    viewIdRaw,
    viewId ? viewId.replace(/\s+/g, "") : "",
    viewIdRaw ? viewIdRaw.replace(/\s+/g, "") : "",
  ].filter(Boolean);

const resolveSearchParams = async (searchParams: SermonViewPageProps["searchParams"]) => {
  const resolvedSearchParams =
    (await Promise.resolve(searchParams)) ?? undefined;
  const viewIdRaw = getQueryValue(resolvedSearchParams, "viewId");
  const viewId = viewIdRaw ? decodeURIComponent(viewIdRaw).trim() : "";
  const debugMode = getQueryValue(resolvedSearchParams, "debug") === "1";
  const tryIds = buildViewIdCandidates(viewId, viewIdRaw);

  return { viewIdRaw, viewId, debugMode, tryIds };
};

const findSermonByCandidates = async (candidates: string[]) => {
  let sermon = null as Sermon | null;
  let matchedField: string | null = null;

  for (const candidate of candidates) {
    const result = await getSermonByViewId(candidate);
    sermon = result.sermon;
    matchedField = result.matchedField;
    if (sermon) break;
  }

  return { sermon, matchedField };
};

const buildSermonDescription = (title: string) =>
  `Watch or Listen to ${title} on Destiny Sermons. Use our built in summary + transcriptions powered by DestinyAI`;

const getShareImageUrl = (sermon: Sermon) => {
  if (sermon.youtubeVideoId) {
    return `https://i.ytimg.com/vi/${sermon.youtubeVideoId}/hqdefault.jpg`;
  }

  return sermon.thumbnailUrl || "/destiny-logo.svg";
};

export async function generateMetadata({
  searchParams,
}: SermonViewPageProps): Promise<Metadata> {
  const { viewId, viewIdRaw, tryIds } = await resolveSearchParams(searchParams);
  const { sermon } = await findSermonByCandidates(tryIds);
  const fallback = (await listSermonsLite(1))[0] ?? fallbackSermon;
  const resolvedSermon = sermon ?? fallback;
  const resolvedViewId = viewId || viewIdRaw || getViewId(resolvedSermon);
  const title = resolvedSermon.title || "Destiny Sermons";
  const description = buildSermonDescription(title);
  const imageUrl = getShareImageUrl(resolvedSermon);
  const url = resolvedViewId
    ? `/sermons/view?viewId=${encodeURIComponent(resolvedViewId)}`
    : "/sermons/view";

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "Destiny Sermons",
      images: [
        {
          url: imageUrl,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

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
  const { viewIdRaw, viewId, debugMode, tryIds } =
    await resolveSearchParams(searchParams);
  const { sermon, matchedField } = await findSermonByCandidates(tryIds);

  const allSermons = await listSermonsLite(100);

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

  let transcriptSegments: Awaited<ReturnType<typeof getTranscriptSegments>> = [];
  if (!transcriptsDisabled) {
    const supabase = tryGetSupabaseAdmin();
    if (supabase) {
      try {
        transcriptSegments = await getTranscriptSegments(supabase, resolvedSermon.id);
      } catch (error) {
        console.warn("[transcript] Failed to load transcript segments", error);
      }
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <SermonDebugPanel
          viewId={viewId}
          viewIdRaw={viewIdRaw}
          debugMode={debugMode}
          matchedField={matchedField}
          tryIds={tryIds}
          resolvedSermonId={resolvedSermon.id}
          resolvedSermonTitle={resolvedSermon.title}
        />

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

        {!resolvedSermon.summaryPoints?.points?.length && (
          <SermonSummary
            summary={resolvedSermon.summary}
            sermonId={resolvedSermon.id}
            sermonTitle={resolvedSermon.title}
          />
        )}
        {resolvedSermon.summaryPoints?.points?.length ? (
          <SermonPoints
            points={resolvedSermon.summaryPoints.points}
            sermonId={resolvedSermon.id}
            sermonTitle={resolvedSermon.title || "Destiny Sermon"}
            audioUrl={resolvedSermon.podcastAudioUrl || ""}
          />
        ) : null}
        <TranscriptBlock
          transcript={transcriptsDisabled ? undefined : resolvedSermon.transcript}
          sermonId={resolvedSermon.id}
          sermonTitle={resolvedSermon.title}
          segments={transcriptSegments.length ? transcriptSegments : undefined}
          disabled={transcriptsDisabled}
        />
      </div>

      <aside className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-destiny-black">
            Recommended
          </h2>
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
