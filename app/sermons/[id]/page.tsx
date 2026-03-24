import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVideo, getAllVideos, formatDate } from "@/lib/youtube";
import SermonPlayer from "@/components/sermons/SermonPlayer";
import SermonDescription from "@/components/sermons/SermonDescription";
import SermonSearchBar from "@/components/sermons/SermonSearchBar";
import ShareButton from "@/components/sermons/ShareButton";
import UpNextSection from "@/components/sermons/UpNextSection";

interface PageProps {
  params: Promise<{ id: string }>;
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
    sub: "Support Destiny Church",
  },
  {
    href: "/connect-card",
    icon: "contact_mail",
    label: "Connect Card",
    sub: "Let us know you're here",
  },
  {
    href: "/whats-on",
    icon: "event",
    label: "What's On",
    sub: "See upcoming events",
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

export default async function SermonPage({ params }: PageProps) {
  const { id } = await params;
  const [video, related] = await Promise.all([getVideo(id), getAllVideos(20)]);

  if (!video) notFound();

  const recommendations = related.filter((v) => v.id !== id);
  const date = formatDate(video.publishedAt);
  const sermonStart = parseSermonStart(video.description);
  const displayDescription = stripSermonTimestamp(video.description);

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
        <SermonPlayer videoId={video.id} thumbnail={video.thumbnail} sermonStart={sermonStart} />

        {/* Title */}
        <h1 className="mb-1 mt-4 text-xl font-black text-white">
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
        <div className="mb-8 flex flex-wrap gap-3">
          {actionCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group flex min-w-[140px] flex-1 items-center gap-3 rounded-2xl bg-[#272727] p-4 transition hover:bg-[#3f3f3f]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destiny-orange/15">
                <span className="material-symbols-rounded text-xl text-destiny-orange">
                  {card.icon}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">{card.label}</p>
                <p className="text-xs text-white/40">{card.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Up Next — horizontal with filter/sort */}
        <UpNextSection videos={recommendations} />
      </div>
    </main>
  );
}
