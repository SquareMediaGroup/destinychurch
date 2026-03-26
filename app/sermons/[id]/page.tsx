import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideo, getAllVideos, getPlaylistVideos, formatDate } from "@/lib/youtube";
import { getSeriesForVideo } from "@/lib/collections";
import SermonPlayer from "@/components/sermons/SermonPlayer";
import SermonDescription from "@/components/sermons/SermonDescription";
import SermonSearchBar from "@/components/sermons/SermonSearchBar";
import ShareButton from "@/components/sermons/ShareButton";
import UpNextSection from "@/components/sermons/UpNextSection";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ series?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) {
    return { title: "Sermon Not Found" };
  }
  const desc = video.description.slice(0, 160);
  const ogImage = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  return {
    title: video.title,
    description: desc,
    alternates: { canonical: `/sermons/${id}` },
    openGraph: {
      title: `${video.title} | Destiny Church`,
      description: desc,
      url: `https://destinytees.uk/sermons/${id}`,
      siteName: "Destiny Church",
      type: "video.other",
      images: [
        {
          url: ogImage,
          width: 1280,
          height: 720,
          alt: video.title,
        },
      ],
      videos: [
        {
          url: `https://www.youtube.com/embed/${id}`,
          width: 1280,
          height: 720,
          type: "text/html",
        },
      ],
    },
    twitter: {
      card: "player",
      title: `${video.title} | Destiny Church`,
      description: desc,
      images: [ogImage],
      players: [
        {
          playerUrl: `https://www.youtube.com/embed/${id}`,
          streamUrl: `https://www.youtube.com/embed/${id}`,
          width: 1280,
          height: 720,
        },
      ],
    },
  };
}

export const revalidate = 3600;

const actionCards = [
  {
    href: "/give",
    icon: "volunteer_activism",
    label: "Give",
    sub: "Support the mission",
    color: "#F58021",
  },
  {
    href: "/connect-card",
    icon: "contact_mail",
    label: "Connect Card",
    sub: "We'd love to hear from you",
    color: "#3B82F6",
  },
  {
    href: "/whats-on",
    icon: "event",
    label: "What's On",
    sub: "Don't miss what's next",
    color: "#8B5CF6",
  },
];

const SERMON_TS_RE =
  /sermon\s*(?:starts?\s*(?:at\s*)?)?[@\-]?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/i;

/** Look for "Sermon starts at 33:15" or "Sermon @ 1:02:30" etc. in the description */
function parseSermonStart(description: string): number | null {
  const match = description.match(SERMON_TS_RE);
  if (!match) return null;
  const h = match[3] ? Number(match[1]) : 0;
  const m = match[3] ? Number(match[2]) : Number(match[1]);
  const s = match[3] ? Number(match[3]) : Number(match[2]);
  return h * 3600 + m * 60 + s;
}

/** Strip the sermon-timestamp line from the description so viewers don't see it */
function stripSermonTimestamp(description: string): string {
  return description.replace(new RegExp(`^.*${SERMON_TS_RE.source}.*$`, "im"), "").trim();
}

export default async function SermonPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { series: seriesPlaylistId } = await searchParams;

  const [video, related] = await Promise.all([getVideo(id), getAllVideos(20)]);

  if (!video) notFound();

  // Try to find series context: either from query param or by scanning all series
  let seriesContext: {
    title: string;
    playlistId: string;
    videos: typeof related;
    currentIndex: number;
  } | null = null;

  if (seriesPlaylistId) {
    const seriesVideos = await getPlaylistVideos(seriesPlaylistId, 50);
    const idx = seriesVideos.findIndex((v) => v.id === id);
    if (idx !== -1) {
      // Find the series title from the collections
      const { getCollections } = await import("@/lib/collections");
      const allSeries = await getCollections("series");
      const match = allSeries.find((s) => s.youtube_playlist_id === seriesPlaylistId);
      seriesContext = {
        title: match?.title ?? "Series",
        playlistId: seriesPlaylistId,
        videos: seriesVideos,
        currentIndex: idx,
      };
    }
  } else {
    // Auto-detect series membership
    const detected = await getSeriesForVideo(id);
    if (detected) {
      seriesContext = {
        title: detected.collection.title,
        playlistId: detected.collection.youtube_playlist_id,
        videos: detected.videos,
        currentIndex: detected.currentIndex,
      };
    }
  }

  const recommendations = related.filter((v) => v.id !== id);
  const date = formatDate(video.publishedAt);
  const sermonStart = parseSermonStart(video.description);
  const displayDescription = stripSermonTimestamp(video.description);

  const nextEpisodeId = seriesContext && seriesContext.currentIndex < seriesContext.videos.length - 1
    ? seriesContext.videos[seriesContext.currentIndex + 1].id
    : null;

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 lg:px-8">
        {/* Search bar */}
        <div className="mb-6">
          <SermonSearchBar />
        </div>

        {/* Back link + Share */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/sermons"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white"
          >
            <span className="material-symbols-rounded text-base">arrow_back</span>
            Back to Sermons
          </Link>
          <ShareButton title={video.title} url={`https://destinytees.uk/sermons/${id}`} />
        </div>

        {/* Player */}
        <SermonPlayer
          videoId={video.id}
          thumbnail={video.thumbnail}
          sermonStart={sermonStart}
          nextEpisodeUrl={nextEpisodeId ? `/sermons/${nextEpisodeId}?series=${seriesContext!.playlistId}` : undefined}
        />

        {/* Series badge */}
        {seriesContext && (
          <div className="mt-4 mb-2 flex items-center gap-2">
            <span className="rounded-full bg-destiny-orange/20 px-3 py-1 text-xs font-bold text-destiny-orange">
              {seriesContext.title}
            </span>
            <span className="text-xs text-white/40">
              Episode {seriesContext.currentIndex + 1} of {seriesContext.videos.length}
            </span>
          </div>
        )}

        {/* Title */}
        <h1 className={`mb-1 ${seriesContext ? "" : "mt-4"} text-xl font-black text-white`}>
          {video.title}
        </h1>

        {/* Meta row */}
        <p className="mb-4 text-sm text-white/50">
          Destiny Church Tees Valley
          {date && <> &middot; {date}</>}
        </p>

        {/* Description */}
        {displayDescription && (
          <div className="mb-6">
            <SermonDescription text={displayDescription} />
          </div>
        )}

        {/* Divider */}
        <div className="mb-6 border-t border-white/10" />

        {/* Action cards */}
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-white/30">What are your Next Steps?</p>
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          {actionCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl p-5 transition hover:scale-[1.02]"
              style={{ background: `linear-gradient(135deg, ${card.color}22, ${card.color}08)`, border: `1px solid ${card.color}25` }}
            >
              <div
                className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: `${card.color}20` }}
              >
                <span className="material-symbols-rounded text-2xl" style={{ color: card.color }}>
                  {card.icon}
                </span>
              </div>
              <p className="text-sm font-bold text-white">{card.label}</p>
              <p className="mt-0.5 text-xs text-white/50">{card.sub}</p>
              <svg
                className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/20 transition group-hover:translate-x-1 group-hover:text-white/50"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Up Next — series episodes or recommendations */}
        <UpNextSection
          videos={recommendations}
          seriesVideos={seriesContext?.videos}
          seriesTitle={seriesContext?.title}
          seriesPlaylistId={seriesContext?.playlistId}
          currentIndex={seriesContext?.currentIndex}
        />
      </div>
    </main>
  );
}
